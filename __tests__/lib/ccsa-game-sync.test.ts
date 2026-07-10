import { describe, it, expect } from "vitest";
import {
  timesOverlap,
  timeToMinutes,
  computeEndTime,
  buildGameNotes,
  findMatchForGame,
  classifyMatch,
  findStaleGames,
} from "@/lib/softball/ccsa-game-reconcile";
import type { ScheduledGameSession } from "@/lib/softball/get-data";

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeSession(overrides: Partial<ScheduledGameSession> = {}): ScheduledGameSession {
  return {
    id: "session-1",
    title: "Game 1: Home vs Thunder",
    date: "2026-07-18",
    time_start: "14:00",
    time_end: "16:00",
    location_name: "Parkway Forest",
    notes: "# CCSA Sync — Do Not Edit\nGame Code: SR2026-W3-G1\nHome vs Thunder",
    status: "active",
    gamecode: "SR2026-W3-G1",
    ...overrides,
  };
}

const TODAY = "2026-07-10";
const PAST_DATE = "2026-06-01";
const FUTURE_DATE = "2026-07-18";

// ─── Utility Tests ───────────────────────────────────────────────────────────

describe("timeToMinutes", () => {
  it("converts HH:MM to minutes", () => {
    expect(timeToMinutes("14:00")).toBe(840);
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("handles HH:MM:SS format", () => {
    expect(timeToMinutes("14:30:00")).toBe(870);
  });
});

describe("computeEndTime", () => {
  it("adds 2 hours to start time", () => {
    expect(computeEndTime("14:00")).toBe("16:00");
    expect(computeEndTime("18:30")).toBe("20:30");
  });

  it("wraps around midnight", () => {
    expect(computeEndTime("23:00")).toBe("01:00");
  });
});

describe("timesOverlap", () => {
  it("returns true for overlapping ranges", () => {
    expect(timesOverlap("14:00", "16:00", "15:00", "17:00")).toBe(true);
  });

  it("returns true for contained ranges", () => {
    expect(timesOverlap("14:00", "18:00", "15:00", "16:00")).toBe(true);
  });

  it("returns true for identical ranges", () => {
    expect(timesOverlap("14:00", "16:00", "14:00", "16:00")).toBe(true);
  });

  it("returns false for adjacent non-overlapping ranges", () => {
    expect(timesOverlap("14:00", "16:00", "16:00", "18:00")).toBe(false);
  });

  it("returns false for completely separate ranges", () => {
    expect(timesOverlap("08:00", "10:00", "14:00", "16:00")).toBe(false);
  });
});

describe("buildGameNotes", () => {
  it("includes sync marker, game code, and opponent", () => {
    const notes = buildGameNotes({
      gamecode: "SR2026-W1-G5",
      isHome: true,
      opponent: "Thunder",
      umps: null,
    });
    expect(notes).toContain("# CCSA Sync — Do Not Edit");
    expect(notes).toContain("Game Code: SR2026-W1-G5");
    expect(notes).toContain("Home vs Thunder");
    expect(notes).not.toContain("Umps");
  });

  it("includes umps when present", () => {
    const notes = buildGameNotes({
      gamecode: "X",
      isHome: false,
      opponent: "Bolts",
      umps: "Lightning",
    });
    expect(notes).toContain("Away vs Bolts");
    expect(notes).toContain("Umps: Team Lightning");
  });
});

// ─── Phase 1: MATCH ──────────────────────────────────────────────────────────

describe("findMatchForGame", () => {
  it("matches by gamecode (Priority 1)", () => {
    const session = makeSession();
    const byCode = new Map([["SR2026-W3-G1", session]]);

    const result = findMatchForGame(
      "SR2026-W3-G1",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [],
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.session.id).toBe("session-1");
    expect(result!.matchedByTime).toBe(false);
  });

  it("matches by date+time overlap when no gamecode match (Priority 2)", () => {
    const manual = makeSession({ id: "manual-1", gamecode: null, notes: null });
    const byCode = new Map<string, ScheduledGameSession>();

    const result = findMatchForGame(
      "SR2026-NEW",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [manual],
      new Set(),
    );

    expect(result).not.toBeNull();
    expect(result!.session.id).toBe("manual-1");
    expect(result!.matchedByTime).toBe(true);
  });

  it("returns null when no gamecode and no time overlap", () => {
    const manual = makeSession({ id: "manual-1", gamecode: null, notes: null });
    const byCode = new Map<string, ScheduledGameSession>();

    const result = findMatchForGame(
      "SR2026-NEW",
      "2026-07-18",
      "18:00", // different time
      "20:00",
      byCode,
      [manual],
      new Set(),
    );

    expect(result).toBeNull();
  });

  it("does not match cancelled sessions by time", () => {
    const cancelled = makeSession({
      id: "cancelled-1",
      gamecode: null,
      notes: null,
      status: "cancelled",
    });
    const byCode = new Map<string, ScheduledGameSession>();

    const result = findMatchForGame(
      "SR2026-NEW",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [cancelled],
      new Set(),
    );

    expect(result).toBeNull();
  });

  it("does not match already-claimed sessions by time", () => {
    const manual = makeSession({ id: "manual-1", gamecode: null, notes: null });
    const byCode = new Map<string, ScheduledGameSession>();
    const claimed = new Set(["manual-1"]);

    const result = findMatchForGame(
      "SR2026-NEW",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [manual],
      claimed,
    );

    expect(result).toBeNull();
  });

  it("prefers gamecode over time overlap", () => {
    const synced = makeSession({ id: "synced-1" });
    const manual = makeSession({ id: "manual-1", gamecode: null, notes: null });
    const byCode = new Map([["SR2026-W3-G1", synced]]);

    const result = findMatchForGame(
      "SR2026-W3-G1",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [manual],
      new Set(),
    );

    expect(result!.session.id).toBe("synced-1");
    expect(result!.matchedByTime).toBe(false);
  });

  it("does not match sessions on different dates by time", () => {
    const manual = makeSession({
      id: "manual-1",
      gamecode: null,
      notes: null,
      date: "2026-07-25", // different date
    });
    const byCode = new Map<string, ScheduledGameSession>();

    const result = findMatchForGame(
      "SR2026-NEW",
      "2026-07-18",
      "14:00",
      "16:00",
      byCode,
      [manual],
      new Set(),
    );

    expect(result).toBeNull();
  });
});

// ─── Phase 2: CLASSIFY ───────────────────────────────────────────────────────

describe("classifyMatch", () => {
  it("Scenario 2: same date + overlapping time → unchanged", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    const action = classifyMatch(session, FUTURE_DATE, "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("Scenario 2b: same date + overlapping time (slight offset) → unchanged", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    // CCSA says 14:30-16:30, overlaps with 14:00-16:00
    const action = classifyMatch(session, FUTURE_DATE, "14:30", "16:30", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("Scenario 3: different date → update (rescheduled)", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    const action = classifyMatch(session, "2026-08-01", "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "update", needsConfirmation: false });
  });

  it("Scenario 4: same date, non-overlapping time → update", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    const action = classifyMatch(session, FUTURE_DATE, "18:00", "20:00", false, TODAY);
    expect(action).toEqual({ type: "update", needsConfirmation: false });
  });

  it("Scenario 6: local session is cancelled → skip", () => {
    const session = makeSession({ date: FUTURE_DATE, status: "cancelled" });
    const action = classifyMatch(session, FUTURE_DATE, "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "skip" });
  });

  it("Scenario 7: session in the past → unchanged (never modify history)", () => {
    const session = makeSession({ date: PAST_DATE, time_start: "14:00", time_end: "16:00" });
    // Even if CCSA shows different date, we don't touch past sessions
    const action = classifyMatch(session, "2026-08-01", "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("Scenario 8: time-matched session rescheduled → update with confirmation", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    const action = classifyMatch(session, "2026-08-01", "14:00", "16:00", true, TODAY);
    expect(action).toEqual({ type: "update", needsConfirmation: true });
  });

  it("Scenario 8b: time-matched, same date + overlapping → unchanged (no confirmation needed)", () => {
    const session = makeSession({ date: FUTURE_DATE, time_start: "14:00", time_end: "16:00" });
    const action = classifyMatch(session, FUTURE_DATE, "14:00", "16:00", true, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("cancelled session in the past → unchanged (past takes priority)", () => {
    const session = makeSession({ date: PAST_DATE, status: "cancelled" });
    const action = classifyMatch(session, FUTURE_DATE, "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("location change only (same date + overlapping time) → unchanged", () => {
    // This is the key fix: location differences don't trigger reschedule
    const session = makeSession({
      date: FUTURE_DATE,
      time_start: "14:00",
      time_end: "16:00",
      location_name: "Parkway Forest Park", // slightly different name
    });
    // CCSA says same date/time but "Parkway Forest" (different location_name)
    const action = classifyMatch(session, FUTURE_DATE, "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });
});

// ─── Phase 3: DETECT ORPHANS ─────────────────────────────────────────────────

describe("findStaleGames", () => {
  it("Scenario 5: gamecode not in CCSA, future + active → stale", () => {
    const sessions = [makeSession({ date: FUTURE_DATE, gamecode: "OLD-CODE" })];
    const ccsaGamecodes = new Set(["OTHER-CODE"]);

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.gamecode).toBe("OLD-CODE");
  });

  it("ignores sessions whose gamecode IS in CCSA", () => {
    const sessions = [makeSession({ date: FUTURE_DATE, gamecode: "ACTIVE-CODE" })];
    const ccsaGamecodes = new Set(["ACTIVE-CODE"]);

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(0);
  });

  it("Scenario 11: past session with missing gamecode → not stale", () => {
    const sessions = [makeSession({ date: PAST_DATE, gamecode: "OLD-CODE" })];
    const ccsaGamecodes = new Set<string>();

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(0);
  });

  it("Scenario 12: cancelled session with missing gamecode → not stale", () => {
    const sessions = [makeSession({ date: FUTURE_DATE, status: "cancelled", gamecode: "OLD" })];
    const ccsaGamecodes = new Set<string>();

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(0);
  });

  it("ignores sessions without gamecode (manually created)", () => {
    const sessions = [makeSession({ date: FUTURE_DATE, gamecode: null })];
    const ccsaGamecodes = new Set<string>();

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(0);
  });

  it("returns multiple stale games", () => {
    const sessions = [
      makeSession({ id: "s1", date: FUTURE_DATE, gamecode: "A" }),
      makeSession({ id: "s2", date: FUTURE_DATE, gamecode: "B" }),
      makeSession({ id: "s3", date: FUTURE_DATE, gamecode: "C" }),
    ];
    const ccsaGamecodes = new Set(["B"]); // only B is still in CCSA

    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(2);
    expect(stale.map((s) => s.gamecode).sort()).toEqual(["A", "C"]);
  });
});

// ─── Integration: Full Scenario Walkthrough ──────────────────────────────────

describe("full scenario: sync → cancel → manual reschedule → re-sync", () => {
  // Simulates: initial sync created sessions, then one game was cancelled day-of,
  // admin cancelled the session, admin created a manual rescheduled session,
  // now we run sync preview again.

  const sessions: ScheduledGameSession[] = [
    // Game 1: synced, still active, unchanged
    makeSession({ id: "g1", date: FUTURE_DATE, time_start: "14:00", time_end: "16:00", gamecode: "CODE-1" }),
    // Game 2: was synced, admin cancelled it (game was rained out)
    makeSession({ id: "g2", date: FUTURE_DATE, time_start: "16:00", time_end: "18:00", gamecode: "CODE-2", status: "cancelled" }),
    // Game 3: admin manually created a rescheduled session (no gamecode)
    makeSession({ id: "g3", date: "2026-07-25", time_start: "14:00", time_end: "16:00", gamecode: null, notes: null }),
    // Game 4: synced long ago, already played
    makeSession({ id: "g4", date: PAST_DATE, time_start: "14:00", time_end: "16:00", gamecode: "CODE-4" }),
  ];

  const sessionsByGamecode = new Map(
    sessions.filter((s) => s.gamecode).map((s) => [s.gamecode!, s]),
  );
  const unmatchedSessions = sessions.filter((s) => !s.gamecode);

  it("Game 1 (unchanged): matches by gamecode, same date+time → unchanged", () => {
    const match = findMatchForGame("CODE-1", FUTURE_DATE, "14:00", "16:00", sessionsByGamecode, unmatchedSessions, new Set());
    expect(match).not.toBeNull();
    expect(match!.matchedByTime).toBe(false);

    const action = classifyMatch(match!.session, FUTURE_DATE, "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" });
  });

  it("Game 2 (cancelled + rescheduled on CCSA): matches gamecode but cancelled → skip", () => {
    // CCSA now shows CODE-2 on a new date (it was rescheduled after rainout)
    const match = findMatchForGame("CODE-2", "2026-07-25", "16:00", "18:00", sessionsByGamecode, unmatchedSessions, new Set());
    expect(match).not.toBeNull();
    expect(match!.session.id).toBe("g2"); // matches the cancelled one

    const action = classifyMatch(match!.session, "2026-07-25", "16:00", "18:00", false, TODAY);
    expect(action).toEqual({ type: "skip" }); // will create new session
  });

  it("Game 3 (manual session matches new CCSA game by time): needs confirmation", () => {
    // A new CCSA game CODE-NEW is on 2026-07-25 14:00-16:00 — matches the manual session
    const claimed = new Set<string>();
    const match = findMatchForGame("CODE-NEW", "2026-07-25", "14:00", "16:00", sessionsByGamecode, unmatchedSessions, claimed);
    expect(match).not.toBeNull();
    expect(match!.session.id).toBe("g3");
    expect(match!.matchedByTime).toBe(true);

    // Same date + overlapping time → unchanged but with matchedByTime flag
    const action = classifyMatch(match!.session, "2026-07-25", "14:00", "16:00", true, TODAY);
    expect(action).toEqual({ type: "unchanged" }); // same slot, no reschedule
  });

  it("Game 4 (past): never modified regardless of CCSA state", () => {
    // CCSA shows CODE-4 moved to a different date (data correction)
    const match = findMatchForGame("CODE-4", "2026-08-15", "14:00", "16:00", sessionsByGamecode, unmatchedSessions, new Set());
    expect(match).not.toBeNull();
    expect(match!.session.id).toBe("g4");

    const action = classifyMatch(match!.session, "2026-08-15", "14:00", "16:00", false, TODAY);
    expect(action).toEqual({ type: "unchanged" }); // past = don't touch
  });

  it("Stale detection: CODE-4 is past so not stale, CODE-1 is in CCSA so not stale", () => {
    const ccsaGamecodes = new Set(["CODE-1", "CODE-2", "CODE-NEW"]);
    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    // CODE-4 is past → not stale. CODE-2 is cancelled → not stale. g3 has no gamecode → not stale.
    expect(stale).toHaveLength(0);
  });

  it("Stale detection: if CODE-1 disappears from CCSA → stale", () => {
    const ccsaGamecodes = new Set(["CODE-2"]); // CODE-1 removed
    const stale = findStaleGames(sessions, ccsaGamecodes, TODAY);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.gamecode).toBe("CODE-1");
  });
});
