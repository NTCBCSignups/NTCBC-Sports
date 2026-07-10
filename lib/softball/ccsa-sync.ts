"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSportAdmin } from "@/lib/supabase/user";
import { installCookieFetch, getCapturedCookies } from "@/lib/softball/ccsa-server-fetch";
import { auth, team, sched } from "@/lib/softball/ccsa-api";
import type { WaiverStatus } from "@/lib/supabase/types";
import { SPORT_TIMEZONE } from "@/lib/timezone";
import { getScheduledGameSessions } from "@/lib/softball/get-data";
import {
  computeEndTime,
  mapsLink,
  buildGameNotes,
  findMatchForGame,
  classifyMatch,
  findStaleGames,
} from "@/lib/softball/ccsa-game-reconcile";
import type { GameDiff, GameUpdate, GamesPreview } from "@/lib/softball/ccsa-game-reconcile";

// Re-export types so the UI can import from this file
export type { GameDiff, GameUpdate, StaleGame, GamesPreview } from "@/lib/softball/ccsa-game-reconcile";

const SPORT = "softball";
const CCSA_COOKIE_NAME = "ccsa_session";
const CCSA_EMAIL_COOKIE = "ccsa_email";

async function ensureSportAdmin() {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, SPORT);
  if (!result.success) throw new Error(result.error);
  return result.user;
}

function mapWaiverStatus(needwaiver: false | "paper" | "online"): WaiverStatus {
  if (needwaiver === false) return "valid";
  if (needwaiver === "paper") return "needs_paper";
  return "needs_online";
}

async function loadCcsaCookies(): Promise<string[]> {
  const cookieStore = await cookies();
  const stored = cookieStore.get(CCSA_COOKIE_NAME)?.value;
  if (!stored) return [];
  try {
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveCcsaCookies(ccsaCookies: string[]): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CCSA_COOKIE_NAME, JSON.stringify(ccsaCookies), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

async function clearCcsaCookies(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(CCSA_COOKIE_NAME);
  cookieStore.delete(CCSA_EMAIL_COOKIE);
}

async function saveCcsaEmail(email: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(CCSA_EMAIL_COOKIE, email, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

async function loadCcsaEmail(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(CCSA_EMAIL_COOKIE)?.value ?? null;
}

export async function requestCcsaLogin(email: string) {
  await ensureSportAdmin();

  installCookieFetch();
  try {
    await auth.requestLoginCode(email, "email");
    await saveCcsaCookies(getCapturedCookies());
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send login code" };
  }
}

export async function completeCcsaLogin(email: string, otp: string) {
  await ensureSportAdmin();

  const existing = await loadCcsaCookies();
  installCookieFetch(existing);
  try {
    await auth.postLogin(email, otp);
    await saveCcsaCookies(getCapturedCookies());
    await saveCcsaEmail(email);
    return { success: true };
  } catch (e) {
    await clearCcsaCookies();
    return { error: e instanceof Error ? e.message : "Login failed" };
  }
}

export async function hasCcsaSession() {
  await ensureSportAdmin();
  const stored = await loadCcsaCookies();
  const email = await loadCcsaEmail();
  return { hasCookies: stored.length > 0, email };
}

export async function logoutCcsa() {
  await ensureSportAdmin();
  await clearCcsaCookies();
  return { success: true };
}

export async function syncCcsaWaivers() {
  await ensureSportAdmin();

  const existing = await loadCcsaCookies();
  if (existing.length === 0) {
    return { error: "No CCSA session. Please log in first." };
  }

  installCookieFetch(existing);
  try {
    const userTeam = await team.userTeam();
    const teamId = userTeam?.teamid;
    if (!teamId) {
      return { error: "Could not determine CCSA team ID" };
    }

    const players = await team.allPlayerInfo(teamId);
    if (!players || players.length === 0) {
      return { error: "No players found on CCSA team" };
    }

    // Save any refreshed cookies
    await saveCcsaCookies(getCapturedCookies());

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const rows = players.map((p) => ({
      email: p.email.toLowerCase(),
      ccsa_player_id: p.playerid,
      first_name: p.firstname,
      last_name: p.lastname,
      waiver_status: mapWaiverStatus(p.needwaiver),
      synced_at: now,
    }));

    const playerSummary = rows.map(({ email, first_name, last_name, waiver_status }) => ({
      email,
      first_name,
      last_name,
      waiver_status,
    }));

    const { error: upsertError } = await admin
      .from("ccsa_players")
      .upsert(rows, { onConflict: "email" });

    if (upsertError) {
      return {
        error: `DB sync failed: ${upsertError.message}`,
        players: playerSummary,
        count: players.length,
      };
    }

    revalidatePath(`/${SPORT}/admin`);
    revalidatePath(`/${SPORT}`);
    return { success: true, count: players.length, players: playerSummary };
  } catch (e) {
    // Session likely expired
    await clearCcsaCookies();
    return {
      error: e instanceof Error ? e.message : "Sync failed — CCSA session may have expired",
    };
  }
}

export async function approveCcsaPlayersForTeam() {
  const user = await ensureSportAdmin();

  const admin = createAdminClient();

  const { data: ccsaPlayers, error: fetchError } = await admin
    .from("ccsa_players")
    .select("email, first_name, last_name");

  if (fetchError || !ccsaPlayers) {
    return { error: fetchError?.message ?? "No CCSA players found" };
  }

  // Fetch all profiles for both exact and fuzzy matching
  const { data: allProfiles, error: profileError } = await admin
    .from("profiles")
    .select("id, email, full_name");

  if (profileError || !allProfiles) {
    return { error: profileError?.message ?? "Could not look up profiles" };
  }

  // Match each CCSA player to a profile: exact email first, then fuzzy name
  const matchedProfileIds = new Set<string>();
  const profilesByEmail = new Map(allProfiles.map((p) => [p.email?.toLowerCase(), p]));

  for (const cp of ccsaPlayers) {
    // Exact email match
    const emailMatch = profilesByEmail.get(cp.email.toLowerCase());
    if (emailMatch) {
      matchedProfileIds.add(emailMatch.id);
      continue;
    }

    // Fuzzy name match
    const pFirst = cp.first_name.toLowerCase().trim();
    const pLast = cp.last_name.toLowerCase().trim();
    for (const profile of allProfiles) {
      const parts = (profile.full_name ?? "").toLowerCase().trim().split(/\s+/);
      if (parts.length < 2) continue;
      const mFirst = parts[0];
      const mLast = parts[parts.length - 1];
      if (mLast === pLast && (mFirst.includes(pFirst) || pFirst.includes(mFirst))) {
        matchedProfileIds.add(profile.id);
        break;
      }
    }
  }

  const profiles = allProfiles.filter((p) => matchedProfileIds.has(p.id));

  const userIds = profiles.map((p) => p.id);

  // Find who is already a team member so we can skip them
  const { data: existingRoles } = await admin
    .from("sport_roles")
    .select("user_id")
    .in("user_id", userIds)
    .eq("sport", SPORT)
    .eq("is_team_member", true);

  const alreadyApproved = new Set(existingRoles?.map((r) => r.user_id) ?? []);
  const newProfiles = profiles.filter((p) => !alreadyApproved.has(p.id));

  if (newProfiles.length === 0) {
    return { success: true, count: 0 };
  }

  // Batch upsert sport_roles for new members only
  const { error: rolesError } = await admin.from("sport_roles").upsert(
    newProfiles.map((p) => ({
      user_id: p.id,
      sport: SPORT,
      is_team_member: true,
    })),
    { onConflict: "user_id,sport" },
  );

  if (rolesError) return { error: `Failed to update roles: ${rolesError.message}` };

  const newUserIds = newProfiles.map((p) => p.id);

  // Batch approve pending team_access_requests
  await admin
    .from("team_access_requests")
    .update({
      status: "approved",
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .in("user_id", newUserIds)
    .eq("sport", SPORT)
    .eq("status", "pending");

  revalidatePath(`/${SPORT}/admin`);
  revalidatePath(`/${SPORT}`);
  return { success: true, count: newProfiles.length };
}

export async function deleteAllCcsaPlayers() {
  await ensureSportAdmin();

  const admin = createAdminClient();
  // Supabase requires a filter on delete; use an always-true condition to delete all rows
  const { error } = await admin.from("ccsa_players").delete().gte("created_at", "1970-01-01");

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}/admin`);
  revalidatePath(`/${SPORT}`);
  return { success: true };
}

// ─── Player Preview (read-only) ─────────────────────────────────────────────

export interface PlayerPreviewEntry {
  email: string;
  first_name: string;
  last_name: string;
  waiver_status: WaiverStatus;
  change: "new" | "updated" | "unchanged";
}

export interface PlayersPreview {
  players: PlayerPreviewEntry[];
  newCount: number;
  updatedCount: number;
  unchangedCount: number;
  teamName: string;
}

export async function getCcsaPlayersPreview(): Promise<PlayersPreview | { error: string }> {
  await ensureSportAdmin();

  const existing = await loadCcsaCookies();
  if (existing.length === 0) {
    return { error: "No CCSA session. Please log in first." };
  }

  installCookieFetch(existing);
  try {
    const userTeam = await team.userTeam();
    const teamId = userTeam?.teamid;
    const teamName = userTeam?.name ?? "Unknown Team";
    if (!teamId) {
      return { error: "Could not determine CCSA team ID" };
    }

    const roster = await team.allPlayerInfo(teamId);
    await saveCcsaCookies(getCapturedCookies());

    if (!roster || roster.length === 0) {
      return { error: "No players found on CCSA team" };
    }

    // Get current DB state for comparison
    const supabase = await createClient();
    const { data: currentPlayers } = await supabase
      .from("ccsa_players")
      .select("email, waiver_status");

    const currentByEmail = new Map(
      (currentPlayers ?? []).map((p) => [p.email.toLowerCase(), p.waiver_status]),
    );

    let newCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;

    const players: PlayerPreviewEntry[] = roster.map((p) => {
      const email = p.email.toLowerCase();
      const waiver = mapWaiverStatus(p.needwaiver);
      const currentWaiver = currentByEmail.get(email);

      let change: "new" | "updated" | "unchanged";
      if (currentWaiver === undefined) {
        change = "new";
        newCount++;
      } else if (currentWaiver !== waiver) {
        change = "updated";
        updatedCount++;
      } else {
        change = "unchanged";
        unchangedCount++;
      }

      return {
        email,
        first_name: p.firstname,
        last_name: p.lastname,
        waiver_status: waiver,
        change,
      };
    });

    return { players, newCount, updatedCount, unchangedCount, teamName };
  } catch (e) {
    // Don't clear cookies here — preview may be called from a server component
    // where cookie mutation is not allowed. Expired sessions will be caught on
    // the next client-triggered action.
    return {
      error: e instanceof Error ? e.message : "Preview failed — CCSA session may have expired",
    };
  }
}

// ─── Game Schedule Sync ─────────────────────────────────────────────────────

function getTodayInSportTimezone(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: SPORT_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date());
}

export async function getCcsaGamesPreview(): Promise<GamesPreview | { error: string }> {
  await ensureSportAdmin();

  const existing = await loadCcsaCookies();
  if (existing.length === 0) {
    return { error: "No CCSA session. Please log in first." };
  }

  installCookieFetch(existing);
  try {
    const userTeam = await team.userTeam();
    const teamId = userTeam?.teamid;
    const teamName = userTeam?.name ?? "Unknown Team";
    if (!teamId) {
      return { error: "Could not determine CCSA team ID" };
    }

    const { schedule, lastupdate } = await sched.getSchedule();
    await saveCcsaCookies(getCapturedCookies());

    // Filter to our team's games and sort chronologically
    const ourGames = schedule
      .filter((g) => g.home === teamId || g.away === teamId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    // Fetch existing sessions from DB
    const existingSessions = await getScheduledGameSessions();

    // Partition sessions for matching
    const sessionsByGamecode = new Map(
      existingSessions.filter((s) => s.gamecode).map((s) => [s.gamecode!, s]),
    );
    const unmatchedSessions = existingSessions.filter((s) => !s.gamecode);

    const today = getTodayInSportTimezone();

    // Reconcile: match → classify → collect results
    const newGames: GameDiff[] = [];
    const updated: GameUpdate[] = [];
    const skipped: GameDiff[] = [];
    const unchanged: GameDiff[] = [];

    const ccsaGamecodes = new Set<string>();
    const claimedIds = new Set<string>();

    for (const game of ourGames) {
      ccsaGamecodes.add(game.gamecode);
      const isHome = game.home === teamId;
      const opponent = isHome ? game.away_name : game.home_name;
      const gameEndTime = computeEndTime(game.time);

      const diff: GameDiff = {
        gamecode: game.gamecode,
        title: `${isHome ? "Home" : "Away"} vs ${opponent}`,
        date: game.date,
        time: game.time,
        location: game.park_name,
        opponent,
        isHome,
        umps: game.umps_name || null,
      };

      // Phase 1: Match
      const match = findMatchForGame(
        game.gamecode,
        game.date,
        game.time,
        gameEndTime,
        sessionsByGamecode,
        unmatchedSessions,
        claimedIds,
      );

      if (!match) {
        newGames.push(diff);
        continue;
      }

      claimedIds.add(match.session.id);

      // Phase 2: Classify
      const action = classifyMatch(
        match.session,
        game.date,
        game.time,
        gameEndTime,
        match.matchedByTime,
        today,
      );

      switch (action.type) {
        case "create":
          newGames.push(diff);
          break;
        case "skip":
          skipped.push(diff);
          break;
        case "update":
          updated.push({
            sessionId: match.session.id,
            gamecode: game.gamecode,
            title: match.session.title ?? diff.title,
            oldDate: match.session.date,
            oldTime: match.session.time_start,
            oldLocation: match.session.location_name,
            newDate: game.date,
            newTime: game.time,
            newLocation: game.park_name,
            opponent,
            isHome,
            umps: game.umps_name || null,
            needsConfirmation: action.needsConfirmation,
          });
          break;
        case "unchanged":
          unchanged.push(diff);
          break;
      }
    }

    // Phase 3: Detect orphans
    const stale = findStaleGames(existingSessions, ccsaGamecodes, today);

    return { newGames, updated, stale, skipped, unchanged, lastupdate, teamName };
  } catch (e) {
    // Don't clear cookies here — preview may be called from a server component
    // where cookie mutation is not allowed. Expired sessions will be caught on
    // the next client-triggered action.
    return {
      error: e instanceof Error ? e.message : "Preview failed — CCSA session may have expired",
    };
  }
}

export async function applyCcsaGameSync(
  newGames: GameDiff[],
  updatedGames: GameUpdate[],
  skippedGames: GameDiff[],
) {
  await ensureSportAdmin();

  const admin = createAdminClient();

  // Count existing scheduled_game sessions for numbering new games
  const { count } = await admin
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .eq("sport", SPORT)
    .eq("session_type", "scheduled_game");

  let gameNumber = (count ?? 0) + 1;

  // Build rows for new games (including skipped ones that need new sessions)
  const allNew = [...newGames, ...skippedGames];
  const insertRows = allNew.map((game) => {
    const timeForParse = game.time.length <= 5 ? `${game.time}:00` : game.time;
    const signupClose = fromZonedTime(`${game.date}T${timeForParse}`, SPORT_TIMEZONE);
    const title = `Game ${gameNumber++}: ${game.title}`;

    return {
      sport: SPORT,
      session_type: "scheduled_game" as const,
      title,
      date: game.date,
      time_start: game.time,
      time_end: computeEndTime(game.time),
      location_name: game.location,
      location_address: game.location,
      location_maps_link: mapsLink(game.location),
      player_cap: null,
      signup_open: new Date().toISOString(),
      signup_close: signupClose.toISOString(),
      notes: buildGameNotes({
        gamecode: game.gamecode,
        isHome: game.isHome,
        opponent: game.opponent,
        umps: game.umps,
      }),
    };
  });

  const results = { created: 0, updated: 0, errors: [] as string[] };

  if (insertRows.length > 0) {
    const { error } = await admin.from("sessions").insert(insertRows);
    if (error) {
      results.errors.push(`Insert failed: ${error.message}`);
    } else {
      results.created = insertRows.length;
    }
  }

  // Update rescheduled games
  for (const game of updatedGames) {
    const timeForParse = game.newTime.length <= 5 ? `${game.newTime}:00` : game.newTime;
    const signupClose = fromZonedTime(`${game.newDate}T${timeForParse}`, SPORT_TIMEZONE);

    const { error } = await admin
      .from("sessions")
      .update({
        date: game.newDate,
        time_start: game.newTime,
        time_end: computeEndTime(game.newTime),
        location_name: game.newLocation,
        location_address: game.newLocation,
        location_maps_link: mapsLink(game.newLocation),
        signup_close: signupClose.toISOString(),
        notes: buildGameNotes({
          gamecode: game.gamecode,
          isHome: game.isHome,
          opponent: game.opponent,
          umps: game.umps,
        }),
      })
      .eq("id", game.sessionId)
      .eq("sport", SPORT)
      .eq("session_type", "scheduled_game");

    if (error) {
      results.errors.push(`Update ${game.gamecode}: ${error.message}`);
    } else {
      results.updated++;
    }
  }

  revalidatePath(`/${SPORT}/admin`);
  revalidatePath(`/${SPORT}`);
  return results;
}

export async function cancelStaleCcsaGames(sessionIds: string[]) {
  await ensureSportAdmin();

  if (sessionIds.length === 0) return { success: true, count: 0 };

  const admin = createAdminClient();
  const { error } = await admin
    .from("sessions")
    .update({
      status: "cancelled",
      status_notes: "Removed from CCSA schedule",
    })
    .in("id", sessionIds)
    .eq("sport", SPORT)
    .eq("session_type", "scheduled_game");

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}/admin`);
  revalidatePath(`/${SPORT}`);
  return { success: true, count: sessionIds.length };
}
