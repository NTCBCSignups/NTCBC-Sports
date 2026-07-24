import { describe, it, expect } from "vitest";
import {
  timesOverlap,
  timeToMinutes,
  computeEndTime,
  buildGameNotes,
  mergeGameNotes,
  findMatchForGame,
  classifyMatch,
  findStaleGames,
} from "@/lib/softball/ccsa-game-reconcile";
import type { ScheduledGameSession } from "@/lib/softball/get-data";

// ─── Test Constants ──────────────────────────────────────────────────────────

const TODAY = "2026-07-15";
const PAST = "2026-06-01";
const FUTURE = "2026-08-01";

// ─── Factory ─────────────────────────────────────────────────────────────────

let idCounter = 0;
function session(overrides: Partial<ScheduledGameSession> = {}): ScheduledGameSession {
  idCounter++;
  return {
    id: `s${idCounter}`,
    title: `Game ${idCounter}`,
    date: FUTURE,
    time_start: "14:00",
    time_end: "16:00",
    location_name: "Field A",
    notes: `# CCSA Sync\nGame Code: GC-${idCounter}`,
    status: "active",
    gamecode: `GC-${idCounter}`,
    ...overrides,
  };
}

function codeMap(...sessions: ScheduledGameSession[]): Map<string, ScheduledGameSession> {
  return new Map(sessions.filter((s) => s.gamecode).map((s) => [s.gamecode!, s]));
}

// ─── Utilities ───────────────────────────────────────────────────────────────

describe("timeToMinutes", () => {
  it.each([
    ["00:00", 0],
    ["14:00", 840],
    ["14:30:00", 870],
    ["23:59", 1439],
  ])("converts %s to %d", (input, expected) => {
    expect(timeToMinutes(input)).toBe(expected);
  });
});

describe("computeEndTime", () => {
  it.each([
    ["14:00", "16:00"],
    ["18:30", "20:30"],
    ["23:00", "01:00"],
  ])("%s + 2h = %s", (start, end) => {
    expect(computeEndTime(start)).toBe(end);
  });
});

describe("timesOverlap", () => {
  it.each([
    { a: ["14:00", "16:00"], b: ["15:00", "17:00"], expected: true, label: "partial overlap" },
    { a: ["14:00", "18:00"], b: ["15:00", "16:00"], expected: true, label: "contained" },
    { a: ["14:00", "16:00"], b: ["14:00", "16:00"], expected: true, label: "identical" },
    { a: ["14:00", "16:00"], b: ["16:00", "18:00"], expected: false, label: "adjacent" },
    { a: ["08:00", "10:00"], b: ["14:00", "16:00"], expected: false, label: "disjoint" },
  ])("$label -> $expected", ({ a, b, expected }) => {
    expect(timesOverlap(a[0]!, a[1]!, b[0]!, b[1]!)).toBe(expected);
  });
});

describe("buildGameNotes", () => {
  it("includes marker, gamecode, side, and umps", () => {
    const notes = buildGameNotes({
      gamecode: "GC-1",
      isHome: true,
      opponent: "Team B",
      umps: "Crew C",
    });
    expect(notes).toContain("# CCSA Sync");
    expect(notes).toContain("Game Code: GC-1");
    expect(notes).toContain("Home vs Team B");
    expect(notes).toContain("Umps: Team Crew C");
  });

  it("omits umps when null", () => {
    const notes = buildGameNotes({
      gamecode: "GC-1",
      isHome: false,
      opponent: "Team B",
      umps: null,
    });
    expect(notes).toContain("Away vs Team B");
    expect(notes).not.toContain("Umps");
  });
});

const SYNC_OPTS = { gamecode: "GC-1", isHome: true, opponent: "Team B", umps: null };

describe("mergeGameNotes", () => {
  it("returns fresh sync notes when existing is null", () => {
    const result = mergeGameNotes(null, SYNC_OPTS);
    expect(result).toContain("# CCSA Sync");
    expect(result).toContain("Game Code: GC-1");
  });

  it("returns fresh sync notes when existing is empty", () => {
    const result = mergeGameNotes("", SYNC_OPTS);
    expect(result).toContain("Game Code: GC-1");
  });

  it("prepends sync block when no marker exists", () => {
    const result = mergeGameNotes("Admin note: bring extra balls", SYNC_OPTS);
    expect(result).toContain("# CCSA Sync");
    expect(result).toContain("Game Code: GC-1");
    expect(result).toContain("Admin note: bring extra balls");
    // Sync block should come before admin note
    const syncIdx = result.indexOf("# CCSA Sync");
    const adminIdx = result.indexOf("Admin note");
    expect(syncIdx).toBeLessThan(adminIdx);
  });

  it("replaces sync block when marker exists, preserves text after", () => {
    const existing =
      "# CCSA Sync — Do Not Edit\nGame Code: OLD-CODE\nHome vs Old Team\n\nAdmin note: important";
    const result = mergeGameNotes(existing, SYNC_OPTS);
    expect(result).toContain("Game Code: GC-1");
    expect(result).not.toContain("OLD-CODE");
    expect(result).not.toContain("Old Team");
    expect(result).toContain("Admin note: important");
  });

  it("preserves text before the sync block", () => {
    const existing = "Pre-sync note\n\n# CCSA Sync — Do Not Edit\nGame Code: OLD\nAway vs X";
    const result = mergeGameNotes(existing, SYNC_OPTS);
    expect(result).toContain("Pre-sync note");
    expect(result).toContain("Game Code: GC-1");
    expect(result).not.toContain("OLD");
  });

  it("never removes admin content", () => {
    const existing = "Note 1\n# CCSA Sync — Do Not Edit\nGame Code: X\nHome vs Y\n\nNote 2\nNote 3";
    const result = mergeGameNotes(existing, SYNC_OPTS);
    expect(result).toContain("Note 1");
    expect(result).toContain("Note 2");
    expect(result).toContain("Note 3");
  });
});

// ─── Phase 1: findMatchForGame ───────────────────────────────────────────────

describe("findMatchForGame", () => {
  it("Priority 1: matches by gamecode", () => {
    const s = session({ gamecode: "GC-X" });
    const r = findMatchForGame("GC-X", FUTURE, "14:00", "16:00", codeMap(s), [], new Set());
    expect(r?.session.id).toBe(s.id);
    expect(r?.matchedByTime).toBe(false);
  });

  it("Priority 2: matches by date+time when no gamecode match", () => {
    const s = session({ gamecode: null, notes: null });
    const r = findMatchForGame("GC-NEW", s.date, "14:00", "16:00", new Map(), [s], new Set());
    expect(r?.session.id).toBe(s.id);
    expect(r?.matchedByTime).toBe(true);
  });

  it("returns null when nothing matches", () => {
    expect(findMatchForGame("GC-X", FUTURE, "14:00", "16:00", new Map(), [], new Set())).toBeNull();
  });

  it("skips cancelled sessions in time matching", () => {
    const s = session({ gamecode: null, status: "cancelled" });
    expect(
      findMatchForGame("GC-X", s.date, "14:00", "16:00", new Map(), [s], new Set()),
    ).toBeNull();
  });

  it("skips already-claimed sessions", () => {
    const s = session({ gamecode: null });
    expect(
      findMatchForGame("GC-X", s.date, "14:00", "16:00", new Map(), [s], new Set([s.id])),
    ).toBeNull();
  });

  it("does not match different dates by time", () => {
    const s = session({ gamecode: null, date: "2026-09-01" });
    expect(
      findMatchForGame("GC-X", FUTURE, "14:00", "16:00", new Map(), [s], new Set()),
    ).toBeNull();
  });

  it("prefers active gamecode over time match", () => {
    const synced = session({ gamecode: "GC-X" });
    const manual = session({ gamecode: null });
    const r = findMatchForGame(
      "GC-X",
      synced.date,
      "14:00",
      "16:00",
      codeMap(synced),
      [manual],
      new Set(),
    );
    expect(r?.session.id).toBe(synced.id);
    expect(r?.matchedByTime).toBe(false);
  });

  it("cancelled gamecode falls through to time replacement", () => {
    const old = session({ gamecode: "GC-X", status: "cancelled", date: PAST });
    const replacement = session({ gamecode: null, date: FUTURE });
    const r = findMatchForGame(
      "GC-X",
      FUTURE,
      "14:00",
      "16:00",
      codeMap(old),
      [replacement],
      new Set(),
    );
    expect(r?.session.id).toBe(replacement.id);
    expect(r?.matchedByTime).toBe(true);
  });

  it("falls back to cancelled gamecode when no time match", () => {
    const old = session({ gamecode: "GC-X", status: "cancelled", date: PAST });
    const r = findMatchForGame("GC-X", FUTURE, "14:00", "16:00", codeMap(old), [], new Set());
    expect(r?.session.id).toBe(old.id);
    expect(r?.matchedByTime).toBe(false);
  });
});

// ─── Phase 2: classifyMatch ──────────────────────────────────────────────────
//
// Full matrix: (CCSA: future|past) x (Local: active|cancelled) x (Local date: future|past)
//
// | # | CCSA  | Local Status | Local Date  | Action     |
// |---|-------|-------------|-------------|------------|
// | 1 | future| active      | future same | unchanged  |
// | 2 | future| active      | future diff | update     |
// | 3 | future| active      | past        | recreate   |
// | 4 | future| cancelled   | future      | recreate   |
// | 5 | future| cancelled   | past        | recreate   |
// | 6 | past  | active      | past same   | skip       |
// | 7 | past  | active      | past diff   | skip       |
// | 8 | past  | active      | future      | mismatch   |
// | 9 | past  | cancelled   | past        | skip       |
// |10 | past  | cancelled   | future      | skip       |

describe("classifyMatch", () => {
  // ── CCSA future ──

  it("#1: future + active future (same slot) -> unchanged", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({ type: "unchanged" });
  });

  it("#1b: same date, overlapping offset -> unchanged", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, FUTURE, "14:30", "16:30", false, TODAY)).toEqual({ type: "unchanged" });
  });

  it("#2: future + active future (different date) -> update", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, "2026-09-01", "14:00", "16:00", false, TODAY)).toEqual({
      type: "update",
      needsConfirmation: false,
    });
  });

  it("#2b: same date, non-overlapping time -> update", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, FUTURE, "18:00", "20:00", false, TODAY)).toEqual({
      type: "update",
      needsConfirmation: false,
    });
  });

  it("#2c: time-matched update -> needsConfirmation", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, "2026-09-01", "14:00", "16:00", true, TODAY)).toEqual({
      type: "update",
      needsConfirmation: true,
    });
  });

  it("#3: future + active past -> recreate", () => {
    const s = session({ date: PAST });
    expect(classifyMatch(s, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({ type: "recreate" });
  });

  it("#4: future + cancelled future -> recreate", () => {
    const s = session({ date: FUTURE, status: "cancelled" });
    expect(classifyMatch(s, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({ type: "recreate" });
  });

  it("#5: future + cancelled past -> recreate", () => {
    const s = session({ date: PAST, status: "cancelled" });
    expect(classifyMatch(s, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({ type: "recreate" });
  });

  // ── CCSA past ──

  it("#6: past + active past (same) -> skip", () => {
    const s = session({ date: PAST });
    expect(classifyMatch(s, PAST, "14:00", "16:00", false, TODAY)).toEqual({ type: "skip" });
  });

  it("#7: past + active past (different date) -> skip", () => {
    const s = session({ date: "2026-05-15" });
    expect(classifyMatch(s, PAST, "14:00", "16:00", false, TODAY)).toEqual({ type: "skip" });
  });

  it("#8: past + active future -> mismatch", () => {
    const s = session({ date: FUTURE });
    expect(classifyMatch(s, PAST, "14:00", "16:00", false, TODAY)).toEqual({ type: "mismatch" });
  });

  it("#9: past + cancelled past -> cancelled (awaiting reschedule)", () => {
    const s = session({ date: PAST, status: "cancelled" });
    expect(classifyMatch(s, PAST, "14:00", "16:00", false, TODAY)).toEqual({ type: "cancelled" });
  });

  it("#10: past + cancelled future -> cancelled (awaiting reschedule)", () => {
    const s = session({ date: FUTURE, status: "cancelled" });
    expect(classifyMatch(s, PAST, "14:00", "16:00", false, TODAY)).toEqual({ type: "cancelled" });
  });

  // ── Invariant: location/title never triggers update ──

  it("location differs but same slot -> unchanged", () => {
    const s = session({ date: FUTURE, location_name: "Different Field Name" });
    expect(classifyMatch(s, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({ type: "unchanged" });
  });
});

// ─── Phase 3: findStaleGames ─────────────────────────────────────────────────

describe("findStaleGames", () => {
  it("future active with missing gamecode -> stale", () => {
    const s = session({ date: FUTURE, gamecode: "GC-GONE" });
    expect(findStaleGames([s], new Set(["GC-OTHER"]), TODAY)).toHaveLength(1);
  });

  it("gamecode in CCSA -> not stale", () => {
    const s = session({ date: FUTURE, gamecode: "GC-OK" });
    expect(findStaleGames([s], new Set(["GC-OK"]), TODAY)).toHaveLength(0);
  });

  it("past -> not stale", () => {
    const s = session({ date: PAST, gamecode: "GC-X" });
    expect(findStaleGames([s], new Set(), TODAY)).toHaveLength(0);
  });

  it("cancelled -> not stale", () => {
    const s = session({ date: FUTURE, status: "cancelled", gamecode: "GC-X" });
    expect(findStaleGames([s], new Set(), TODAY)).toHaveLength(0);
  });

  it("no gamecode -> not stale", () => {
    const s = session({ date: FUTURE, gamecode: null });
    expect(findStaleGames([s], new Set(), TODAY)).toHaveLength(0);
  });

  it("multiple stale among mixed sessions", () => {
    const all = [
      session({ date: FUTURE, gamecode: "A" }),
      session({ date: FUTURE, gamecode: "B" }),
      session({ date: FUTURE, gamecode: "C" }),
      session({ date: PAST, gamecode: "D" }),
      session({ date: FUTURE, status: "cancelled", gamecode: "E" }),
    ];
    const stale = findStaleGames(all, new Set(["B"]), TODAY);
    expect(stale.map((s) => s.gamecode).sort()).toEqual(["A", "C"]);
  });
});

// ─── Integration: full lifecycle ─────────────────────────────────────────────

describe("lifecycle: sync -> cancel -> manual reschedule -> re-sync", () => {
  const sessions: ScheduledGameSession[] = [
    session({ id: "g1", date: FUTURE, gamecode: "C1" }),
    session({
      id: "g2",
      date: FUTURE,
      time_start: "16:00",
      time_end: "18:00",
      gamecode: "C2",
      status: "cancelled",
    }),
    session({ id: "g3", date: "2026-08-10", gamecode: null, notes: null }),
    session({ id: "g4", date: PAST, gamecode: "C4" }),
  ];
  const byCode = codeMap(...sessions);
  const unmatched = sessions.filter((s) => !s.gamecode);

  it("unchanged: same gamecode, same slot", () => {
    const m = findMatchForGame("C1", FUTURE, "14:00", "16:00", byCode, unmatched, new Set())!;
    expect(classifyMatch(m.session, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({
      type: "unchanged",
    });
  });

  it("cancelled + rescheduled on CCSA -> recreate", () => {
    const m = findMatchForGame("C2", "2026-08-10", "16:00", "18:00", byCode, unmatched, new Set())!;
    expect(m.session.id).toBe("g2");
    expect(classifyMatch(m.session, "2026-08-10", "16:00", "18:00", false, TODAY)).toEqual({
      type: "recreate",
    });
  });

  it("manual session matched by time -> unchanged", () => {
    const m = findMatchForGame(
      "C-NEW",
      "2026-08-10",
      "14:00",
      "16:00",
      byCode,
      unmatched,
      new Set(),
    )!;
    expect(m.session.id).toBe("g3");
    expect(classifyMatch(m.session, "2026-08-10", "14:00", "16:00", true, TODAY)).toEqual({
      type: "unchanged",
    });
  });

  it("past session + CCSA future -> recreate", () => {
    const m = findMatchForGame("C4", FUTURE, "14:00", "16:00", byCode, unmatched, new Set())!;
    expect(classifyMatch(m.session, FUTURE, "14:00", "16:00", false, TODAY)).toEqual({
      type: "recreate",
    });
  });

  it("stale: future active not in CCSA", () => {
    const stale = findStaleGames(sessions, new Set(["C2"]), TODAY);
    expect(stale).toHaveLength(1);
    expect(stale[0]!.gamecode).toBe("C1");
  });

  it("not stale: past + cancelled excluded", () => {
    const stale = findStaleGames(sessions, new Set(["C1", "C2"]), TODAY);
    expect(stale).toHaveLength(0);
  });
});
