"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSportAdmin } from "@/lib/supabase/user";
import { installCookieFetch, getCapturedCookies } from "@/lib/softball/ccsa-server-fetch";
import { auth, team } from "@/lib/softball/ccsa-api";
import type { WaiverStatus } from "@/lib/supabase/types";
import { SPORT_TIMEZONE } from "@/lib/timezone";
import { computeEndTime, mapsLink, buildGameNotes } from "@/lib/softball/ccsa-game-reconcile";
import type { GameDiff, GameUpdate } from "@/lib/softball/ccsa-game-reconcile";

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

// ─── Game Schedule Mutations ────────────────────────────────────────────────

export async function applyCcsaGameSync(
  newGames: GameDiff[],
  updatedGames: GameUpdate[],
  skippedGames: GameDiff[],
  allTeamGamecodes: string[],
) {
  await ensureSportAdmin();

  const admin = createAdminClient();

  // Compute game number from gamecode suffix rank among all team games
  const sortedCodes = [...allTeamGamecodes].sort((a, b) => {
    const suffixA = parseInt(a.slice(-3));
    const suffixB = parseInt(b.slice(-3));
    return suffixA - suffixB;
  });
  const gameNumberByCode = new Map(sortedCodes.map((code, i) => [code, i + 1]));

  // Build rows for new games (including skipped ones that need new sessions)
  const allNew = [...newGames, ...skippedGames];
  const insertRows = allNew.map((game) => {
    const timeForParse = game.time.length <= 5 ? `${game.time}:00` : game.time;
    const signupClose = fromZonedTime(`${game.date}T${timeForParse}`, SPORT_TIMEZONE);
    const num = gameNumberByCode.get(game.gamecode) ?? "?";
    const title = `Game ${num}: ${game.title}`;

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
