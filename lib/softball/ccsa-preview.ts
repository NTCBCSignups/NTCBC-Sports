/**
 * Read-only preview functions for CCSA sync.
 * These are NOT server actions — they can be called from server components
 * and client-triggered server actions alike.
 *
 * They read from the CCSA API + local DB but never write.
 */

import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import { installCookieFetch, getCapturedCookies } from "@/lib/softball/ccsa-server-fetch";
import { team, sched } from "@/lib/softball/ccsa-api";
import type { WaiverStatus } from "@/lib/supabase/types";
import { SPORT_TIMEZONE } from "@/lib/timezone";
import { getScheduledGameSessions } from "@/lib/softball/get-data";
import {
  computeEndTime,
  findMatchForGame,
  classifyMatch,
  findStaleGames,
} from "@/lib/softball/ccsa-game-reconcile";
import type { GameDiff, GameUpdate, GamesPreview } from "@/lib/softball/ccsa-game-reconcile";

export type { GamesPreview, GameDiff, GameUpdate, StaleGame } from "@/lib/softball/ccsa-game-reconcile";

const SPORT = "softball";
const CCSA_COOKIE_NAME = "ccsa_session";

// ─── Shared cookie helpers (read-only) ──────────────────────────────────────

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
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

// ─── Player Preview ─────────────────────────────────────────────────────────

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

function mapWaiverStatus(needwaiver: false | "paper" | "online"): WaiverStatus {
  if (needwaiver === false) return "valid";
  if (needwaiver === "paper") return "needs_paper";
  return "needs_online";
}

export async function getCcsaPlayersPreview(): Promise<PlayersPreview | { error: string }> {
  const supabase = await createClient();
  const adminCheck = await requireSportAdmin(supabase, SPORT);
  if (!adminCheck.success) return { error: adminCheck.error };

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

      return { email, first_name: p.firstname, last_name: p.lastname, waiver_status: waiver, change };
    });

    return { players, newCount, updatedCount, unchangedCount, teamName };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Preview failed — CCSA session may have expired",
    };
  }
}

// ─── Game Preview ───────────────────────────────────────────────────────────

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
  const supabase = await createClient();
  const adminCheck = await requireSportAdmin(supabase, SPORT);
  if (!adminCheck.success) return { error: adminCheck.error };

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

    const ourGames = schedule
      .filter((g) => g.home === teamId || g.away === teamId)
      .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

    const existingSessions = await getScheduledGameSessions();

    const sessionsByGamecode = new Map(
      existingSessions.filter((s) => s.gamecode).map((s) => [s.gamecode!, s]),
    );
    const unmatchedSessions = existingSessions.filter((s) => !s.gamecode);

    const today = getTodayInSportTimezone();

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

    const stale = findStaleGames(existingSessions, ccsaGamecodes, today);

    return { newGames, updated, stale, skipped, unchanged, lastupdate, teamName };
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Preview failed — CCSA session may have expired",
    };
  }
}
