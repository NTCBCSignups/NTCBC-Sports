/**
 * Pure reconciliation logic for CCSA game schedule sync.
 *
 * Algorithm: Three-phase reconciliation
 *   Phase 1 — MATCH: Associate each CCSA game with a local session (or null)
 *     Priority 1: Gamecode in notes (definitive, previously synced)
 *     Priority 2: Same date + overlapping time (heuristic, manually created)
 *   Phase 2 — CLASSIFY: Determine action for each (CcsaGame, LocalSession?) pair
 *     - No match → create
 *     - Match is in the past → unchanged (never modify history)
 *     - Match is cancelled → skip (leave it, create fresh session)
 *     - Date differs OR times don't overlap → update (rescheduled)
 *     - Same date + overlapping times → unchanged
 *   Phase 3 — DETECT ORPHANS: Local sessions with gamecodes not in CCSA schedule
 *     - Future + active → stale (warn admin)
 *
 * Scenarios handled:
 *   1. Fresh game on CCSA, no local session → CREATE
 *   2. CCSA game matches gamecode, same date+time → UNCHANGED
 *   3. CCSA game matches gamecode, different date → UPDATE
 *   4. CCSA game matches gamecode, same date, non-overlapping time → UPDATE
 *   5. Game removed from CCSA, local has gamecode, active+future → STALE
 *   6. CCSA game matches gamecode, local is cancelled → SKIP (create new)
 *   7. CCSA game matches gamecode, local is in past → UNCHANGED (no touch)
 *   8. CCSA game matches manually-created by date+time → UPDATE (needsConfirmation)
 *   9. Cancelled local, no gamecode, CCSA on same date+time → not matched
 *  10. Past sessions without gamecode → not matched (ignored)
 */

import type { ScheduledGameSession } from "@/lib/softball/get-data";

// ─── Constants ──────────────────────────────────────────────────────────────

const GAME_DURATION_HOURS = 2;
const SYNC_MARKER = "# CCSA Sync — Do Not Edit";

// ─── Types ──────────────────────────────────────────────────────────────────

export type GameStatus =
  | "synced"
  | "new"
  | "recreate"
  | "update"
  | "stale"
  | "past"
  | "not_found"
  | "mismatch";

export interface GameRow {
  gamecode: string;
  title: string;
  date: string;
  time: string;
  location: string;
  opponent: string;
  isHome: boolean;
  umps: string | null;
  status: GameStatus;
  /** Present for "update" — the session being modified in place */
  sessionId?: string;
  /** Present for "update" — old values before reschedule */
  oldDate?: string;
  oldTime?: string;
  oldLocation?: string;
  /** Present for "stale" — the orphaned session ID */
  staleSessionId?: string;
  /** Present for "update" matched by time overlap (not gamecode) */
  needsConfirmation?: boolean;
}

export interface GamesPreview {
  /** All games sorted by date ascending, with their sync status */
  games: GameRow[];
  lastupdate: string;
  teamName: string;
}

export type MatchResult = {
  session: ScheduledGameSession;
  matchedByTime: boolean;
} | null;

/**
 * Sync actions — each is semantically distinct:
 * - create:    No local match, CCSA is future. Insert a new session.
 * - not_found: No local match, CCSA is past. Never synced, too late now.
 * - recreate:  Matched a past/cancelled session, CCSA is future. Create new.
 * - update:    Matched an active future session. Modify in place.
 * - unchanged: Matched, same date+time slot. No action needed.
 * - skip:      Both local and CCSA in the past. Normal completed game.
 * - mismatch:  CCSA is past but local is active+future. Data anomaly.
 */
export type SyncAction =
  | { type: "create" }
  | { type: "not_found" }
  | { type: "recreate" }
  | { type: "update"; needsConfirmation: boolean }
  | { type: "unchanged" }
  | { type: "skip" }
  | { type: "mismatch" };

// ─── Pure utility functions ─────────────────────────────────────────────────

export function computeEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number) as [number, number];
  const endHour = (h + GAME_DURATION_HOURS) % 24;
  return `${String(endHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function mapsLink(parkName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName)}`;
}

export function buildGameNotes(opts: {
  gamecode: string;
  isHome: boolean;
  opponent: string;
  umps: string | null;
}): string {
  const lines = [
    SYNC_MARKER,
    `Game Code: ${opts.gamecode}`,
    `${opts.isHome ? "Home" : "Away"} vs ${opts.opponent}`,
  ];
  if (opts.umps) lines.push(`Umps: Team ${opts.umps}`);
  return lines.join("\n");
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number) as [number, number];
  return h * 60 + m;
}

export function timesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

// ─── Phase 1: MATCH ─────────────────────────────────────────────────────────

/**
 * Find the local session that corresponds to a CCSA game.
 * Priority 1: Gamecode match (definitive).
 * Priority 2: Same date + overlapping time on an unmatched, active session (heuristic).
 */
export function findMatchForGame(
  gamecode: string,
  gameDate: string,
  gameTime: string,
  gameEndTime: string,
  sessionsByGamecode: Map<string, ScheduledGameSession>,
  unmatchedSessions: ScheduledGameSession[],
  claimedIds: Set<string>,
): MatchResult {
  const byCode = sessionsByGamecode.get(gamecode);

  // If gamecode match is active, use it directly (Priority 1)
  if (byCode && byCode.status !== "cancelled") {
    return { session: byCode, matchedByTime: false };
  }

  // If gamecode match is cancelled (or missing), check for an active session
  // on the same date+time — this catches manually-created replacements (Priority 2)
  const byTime = unmatchedSessions.find(
    (s) =>
      s.status !== "cancelled" &&
      s.date === gameDate &&
      !claimedIds.has(s.id) &&
      timesOverlap(gameTime, gameEndTime, s.time_start, s.time_end),
  );
  if (byTime) {
    return { session: byTime, matchedByTime: true };
  }

  // Fall back to cancelled gamecode match for proper "recreate" classification
  if (byCode) {
    return { session: byCode, matchedByTime: false };
  }

  return null;
}

// ─── Phase 2: CLASSIFY ──────────────────────────────────────────────────────

/**
 * Given a matched (CcsaGame → LocalSession) pair, determine the sync action.
 * Only considers date and time overlap — ignores title, location, notes.
 */
export function classifyMatch(
  session: ScheduledGameSession,
  gameDate: string,
  gameTime: string,
  gameEndTime: string,
  matchedByTime: boolean,
  today: string,
): SyncAction {
  const ccsaIsPast = gameDate < today;
  const localIsPast = session.date < today;
  const localIsCancelled = session.status === "cancelled";

  // ── CCSA game is in the past ──────────────────────────────────────────
  if (ccsaIsPast) {
    // Local is active + future but CCSA is past → data anomaly
    if (!localIsCancelled && !localIsPast) {
      return { type: "mismatch" };
    }
    // Both past, or local cancelled → completed game, nothing to do
    return { type: "skip" };
  }

  // ── CCSA game is in the future ────────────────────────────────────────

  // Past or cancelled local session → leave it, create a fresh one
  if (localIsCancelled || localIsPast) {
    return { type: "recreate" };
  }

  // Date changed → rescheduled, modify in place
  if (session.date !== gameDate) {
    return { type: "update", needsConfirmation: matchedByTime };
  }

  // Same date but times don't overlap → time changed significantly
  if (!timesOverlap(gameTime, gameEndTime, session.time_start, session.time_end)) {
    return { type: "update", needsConfirmation: matchedByTime };
  }

  // Same date + overlapping times → same slot, no meaningful change
  return { type: "unchanged" };
}

// ─── Phase 3: DETECT ORPHANS ────────────────────────────────────────────────

export function findStaleGames(
  sessions: ScheduledGameSession[],
  ccsaGamecodes: Set<string>,
  today: string,
): GameRow[] {
  return sessions
    .filter(
      (s) =>
        s.gamecode !== null &&
        !ccsaGamecodes.has(s.gamecode) &&
        s.date >= today &&
        s.status !== "cancelled",
    )
    .map((s) => ({
      gamecode: s.gamecode!,
      title: s.title ?? s.gamecode!,
      date: s.date,
      time: s.time_start,
      location: s.location_name,
      opponent: "",
      isHome: false,
      umps: null,
      status: "stale" as const,
      staleSessionId: s.id,
    }));
}
