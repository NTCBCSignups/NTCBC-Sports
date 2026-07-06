import { describe, it, expect } from "vitest";
import {
  formatWeek,
  formatMonth,
  computeAttendanceTrend,
  computeSummary,
  computeTypeStats,
  computeEngagement,
  computeGrowth,
  computePlayerStats,
} from "@/components/sports/statistics/compute";
import type { SignupRow, SessionRow } from "@/lib/get-statistics";

// ── Fixtures ─────────────────────────────────────────────────────

const TODAY = new Date().toISOString().split("T")[0]!;

function makeSignupRow(overrides: Partial<SignupRow> = {}): SignupRow {
  return {
    sessionId: "session-1",
    sessionDate: "2026-06-01",
    sessionType: "practice",
    userId: "user-1",
    userName: "Alice",
    playerCap: 20,
    ...overrides,
  };
}

function makeSessionRow(overrides: Partial<SessionRow> = {}): SessionRow {
  return {
    id: "session-1",
    date: "2026-06-01",
    sessionType: "practice",
    playerCap: 20,
    ...overrides,
  };
}

// ── formatWeek ───────────────────────────────────────────────────

describe("formatWeek", () => {
  it("formats YYYY-MM-DD as M/D", () => {
    expect(formatWeek("2026-06-15")).toBe("6/15");
  });

  it("formats January correctly (no leading zero)", () => {
    expect(formatWeek("2026-01-05")).toBe("1/5");
  });

  it("handles string coercion", () => {
    expect(formatWeek("2026-12-25")).toBe("12/25");
  });
});

// ── formatMonth ──────────────────────────────────────────────────

describe("formatMonth", () => {
  it("formats YYYY-MM as month abbreviation", () => {
    expect(formatMonth("2026-01")).toBe("Jan");
    expect(formatMonth("2026-06")).toBe("Jun");
    expect(formatMonth("2026-12")).toBe("Dec");
  });
});

// ── computeSummary ───────────────────────────────────────────────

describe("computeSummary", () => {
  it("returns zeros for empty data", () => {
    const result = computeSummary([], 0);
    expect(result.totalSessions).toBe(0);
    expect(result.uniqueAttendees).toBe(0);
    expect(result.avgAttendance).toBe(0);
    expect(result.avgFillRate).toBeNull();
  });

  it("computes unique attendees", () => {
    const rows = [
      makeSignupRow({ userId: "u1" }),
      makeSignupRow({ userId: "u2" }),
      makeSignupRow({ userId: "u1", sessionId: "s2" }),
    ];
    const result = computeSummary(rows, 2);
    expect(result.uniqueAttendees).toBe(2);
  });

  it("computes average attendance", () => {
    const rows = [
      makeSignupRow({ sessionId: "s1" }),
      makeSignupRow({ sessionId: "s1", userId: "u2" }),
      makeSignupRow({ sessionId: "s2" }),
    ];
    const result = computeSummary(rows, 2);
    expect(result.avgAttendance).toBe(1.5);
  });

  it("computes fill rate for capped sessions", () => {
    const rows = [
      makeSignupRow({ sessionId: "s1", playerCap: 10 }),
      makeSignupRow({ sessionId: "s1", playerCap: 10, userId: "u2" }),
    ];
    const result = computeSummary(rows, 1);
    expect(result.avgFillRate).toBe(0.2); // 2/10
  });

  it("returns null fill rate when no capped sessions", () => {
    const rows = [makeSignupRow({ playerCap: null })];
    const result = computeSummary(rows, 1);
    expect(result.avgFillRate).toBeNull();
  });
});

// ── computeTypeStats ─────────────────────────────────────────────

describe("computeTypeStats", () => {
  it("groups by session type", () => {
    const rows = [
      makeSignupRow({ sessionType: "practice", sessionId: "s1" }),
      makeSignupRow({ sessionType: "practice", sessionId: "s1", userId: "u2" }),
      makeSignupRow({ sessionType: "game", sessionId: "s2" }),
    ];
    const result = computeTypeStats(rows);
    expect(result).toHaveLength(2);

    const practice = result.find((r) => r.type === "practice")!;
    expect(practice.sessionCount).toBe(1);
    expect(practice.avgAttendance).toBe(2);

    const game = result.find((r) => r.type === "game")!;
    expect(game.sessionCount).toBe(1);
    expect(game.avgAttendance).toBe(1);
  });
});

// ── computeEngagement ────────────────────────────────────────────

describe("computeEngagement", () => {
  it("counts active vs inactive users", () => {
    const rows = [
      makeSignupRow({ userId: "u1", sessionDate: TODAY }),
      makeSignupRow({ userId: "u2", sessionDate: "2025-01-01" }),
    ];
    const users = [
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
      { id: "u3", name: "Charlie" },
    ];
    const result = computeEngagement(rows, 2, new Map([["practice", 2]]), users);
    expect(result.activeCount).toBe(1); // only u1 (today)
    expect(result.inactiveCount).toBe(2); // u2 (old) + u3 (no signups)
  });

  it("includes all users even with zero signups", () => {
    const users = [
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ];
    const result = computeEngagement([], 0, new Map(), users);
    expect(result.attendees).toHaveLength(2);
    expect(result.attendees[0]!.count).toBe(0);
  });

  it("marks active/inactive correctly on attendees", () => {
    const rows = [makeSignupRow({ userId: "u1", sessionDate: TODAY })];
    const users = [
      { id: "u1", name: "Alice" },
      { id: "u2", name: "Bob" },
    ];
    const result = computeEngagement(rows, 1, new Map([["practice", 1]]), users);
    expect(result.attendees.find((a) => a.userId === "u1")!.isActive).toBe(true);
    expect(result.attendees.find((a) => a.userId === "u2")!.isActive).toBe(false);
  });

  it("computes per-type counts", () => {
    const rows = [
      makeSignupRow({ userId: "u1", sessionType: "practice" }),
      makeSignupRow({ userId: "u1", sessionType: "practice", sessionId: "s2" }),
      makeSignupRow({ userId: "u1", sessionType: "game", sessionId: "s3" }),
    ];
    const users = [{ id: "u1", name: "Alice" }];
    const result = computeEngagement(
      rows,
      3,
      new Map([
        ["practice", 2],
        ["game", 1],
      ]),
      users,
    );
    const alice = result.attendees[0]!;
    expect(alice.typeCounts.practice).toBe(2);
    expect(alice.typeCounts.game).toBe(1);
  });
});

// ── computeGrowth ────────────────────────────────────────────────

describe("computeGrowth", () => {
  it("returns 6 months of data", () => {
    const result = computeGrowth([]);
    expect(result).toHaveLength(6);
  });

  it("counts new members by first signup month", () => {
    const rows = [
      makeSignupRow({ userId: "u1", sessionDate: TODAY }),
      makeSignupRow({ userId: "u1", sessionDate: "2025-01-01" }), // earlier date = real first
    ];
    const result = computeGrowth(rows);
    // u1's first signup is 2025-01-01, which is outside the 6-month window
    const total = result.reduce((sum, g) => sum + g.newMembers, 0);
    expect(total).toBe(0); // first signup too old for 6-month window
  });
});

// ── computeAttendanceTrend ───────────────────────────────────────

describe("computeAttendanceTrend", () => {
  it("returns correct number of weeks", () => {
    const result = computeAttendanceTrend([], [], 12);
    expect(result.data).toHaveLength(12);
  });

  it("returns 4 weeks when timeRange is 4", () => {
    const result = computeAttendanceTrend([], [], 4);
    expect(result.data).toHaveLength(4);
  });

  it("collects all types from data", () => {
    const rows = [
      makeSignupRow({ sessionType: "practice", sessionDate: TODAY }),
      makeSignupRow({ sessionType: "game", sessionDate: TODAY }),
    ];
    const sessions = [
      makeSessionRow({ date: TODAY, sessionType: "practice" }),
      makeSessionRow({ id: "s2", date: TODAY, sessionType: "game" }),
    ];
    const result = computeAttendanceTrend(rows, sessions, 4);
    expect(result.types).toContain("practice");
    expect(result.types).toContain("game");
  });

  it("counts signups in correct week bucket", () => {
    const rows = [
      makeSignupRow({ sessionDate: TODAY }),
      makeSignupRow({ sessionDate: TODAY, userId: "u2" }),
    ];
    const sessions = [makeSessionRow({ date: TODAY })];
    const result = computeAttendanceTrend(rows, sessions, 4);
    const lastWeek = result.data[result.data.length - 1]!;
    expect(lastWeek.all).toBe(2);
  });

  it("uses null for weeks with no sessions of a type", () => {
    const rows = [makeSignupRow({ sessionDate: TODAY })];
    const sessions = [makeSessionRow({ date: TODAY })];
    const result = computeAttendanceTrend(rows, sessions, 4);
    // Weeks without sessions should be null
    const nullWeeks = result.data.filter((d) => d.all === null);
    expect(nullWeeks.length).toBeGreaterThan(0);
  });
});

// ── computePlayerStats ───────────────────────────────────────────

describe("computePlayerStats", () => {
  it("returns null for user with no signups", () => {
    const result = computePlayerStats([], "u1", [], 12);
    expect(result).toBeNull();
  });

  it("computes basic stats", () => {
    const rows = [
      makeSignupRow({ userId: "u1", sessionDate: "2026-06-01" }),
      makeSignupRow({ userId: "u1", sessionDate: "2026-06-08", sessionId: "s2" }),
      makeSignupRow({ userId: "u1", sessionDate: "2026-06-15", sessionId: "s3" }),
    ];
    const sessions = [
      makeSessionRow({ id: "s1", date: "2026-06-01" }),
      makeSessionRow({ id: "s2", date: "2026-06-08" }),
      makeSessionRow({ id: "s3", date: "2026-06-15" }),
    ];
    const result = computePlayerStats(rows, "u1", sessions, 12)!;
    expect(result.totalSignups).toBe(3);
    expect(result.firstSession).toBe("2026-06-01");
    expect(result.lastSession).toBe("2026-06-15");
    expect(result.avgFrequency).toBe(7); // 14 days / 2 gaps = 7
    expect(result.longestGap).toBe(7);
  });

  it("computes type breakdown", () => {
    const rows = [
      makeSignupRow({ userId: "u1", sessionType: "practice" }),
      makeSignupRow({
        userId: "u1",
        sessionType: "practice",
        sessionId: "s2",
        sessionDate: "2026-06-08",
      }),
      makeSignupRow({
        userId: "u1",
        sessionType: "game",
        sessionId: "s3",
        sessionDate: "2026-06-15",
      }),
    ];
    const sessions = [
      makeSessionRow({ id: "s1" }),
      makeSessionRow({ id: "s2", date: "2026-06-08" }),
      makeSessionRow({ id: "s3", date: "2026-06-15", sessionType: "game" }),
    ];
    const result = computePlayerStats(rows, "u1", sessions, 12)!;
    expect(result.typeBreakdown).toEqual([
      { type: "practice", count: 2 },
      { type: "game", count: 1 },
    ]);
  });

  it("uses null for weeks with no sessions (0/0)", () => {
    // Only one session in week 1, nothing in week 2
    const rows = [makeSignupRow({ userId: "u1", sessionDate: TODAY })];
    const sessions = [makeSessionRow({ id: "s1", date: TODAY })];
    const result = computePlayerStats(rows, "u1", sessions, 4)!;
    // Most weeks should be null (no sessions existed)
    const nullWeeks = result.weeklyData.filter((d) => d.all === null);
    expect(nullWeeks.length).toBeGreaterThan(0);
  });

  it("shows 100% when attended all sessions in a week", () => {
    const rows = [makeSignupRow({ userId: "u1", sessionDate: TODAY })];
    const sessions = [makeSessionRow({ id: "s1", date: TODAY })];
    const result = computePlayerStats(rows, "u1", sessions, 4)!;
    const thisWeek = result.weeklyData.find((d) => d.all === 100);
    expect(thisWeek).toBeDefined();
  });

  it("shows raw X/Y in weeklyRaw", () => {
    const rows = [makeSignupRow({ userId: "u1", sessionDate: TODAY })];
    const sessions = [
      makeSessionRow({ id: "s1", date: TODAY }),
      makeSessionRow({ id: "s2", date: TODAY }),
    ];
    const result = computePlayerStats(rows, "u1", sessions, 4)!;
    const rawForThisWeek = result.weeklyRaw.find((r) => r.all === "1/2");
    expect(rawForThisWeek).toBeDefined();
  });

  it("daysAgo is 0 for today", () => {
    const rows = [makeSignupRow({ userId: "u1", sessionDate: TODAY })];
    const sessions = [makeSessionRow({ id: "s1", date: TODAY })];
    const result = computePlayerStats(rows, "u1", sessions, 4)!;
    expect(result.daysAgo).toBe(0);
  });
});

// ── TrendChart data contract: 0/0 → null ─────────────────────────
// Any data fed to TrendChart must use null (not 0) for time periods
// with no sessions. This ensures the chart gaps the line instead of
// plotting a misleading zero.

describe("TrendChart data contract: no-sessions periods must be null", () => {
  it("computeAttendanceTrend: null for weeks with no sessions, 0 only when sessions exist", () => {
    const rows = [makeSignupRow({ sessionDate: TODAY, sessionType: "practice" })];
    const sessions = [makeSessionRow({ date: TODAY, sessionType: "practice" })];
    const result = computeAttendanceTrend(rows, sessions, 8);

    for (const point of result.data) {
      if (point.all === null) {
        // No sessions this week → all type keys must also be null
        for (const type of result.types) {
          expect(point[type]).toBeNull();
        }
      } else {
        // Sessions existed → value is a number (0 = nobody came, N = N signups)
        expect(typeof point.all).toBe("number");
      }
    }
  });

  it("computePlayerStats: null for weeks with no sessions, 0% when sessions exist but unattended", () => {
    // User signed up for one old session so we get a non-null result
    const rows = [makeSignupRow({ userId: "u1", sessionDate: "2026-01-01" })];
    const sessions = [
      makeSessionRow({ id: "s-old", date: "2026-01-01" }),
      makeSessionRow({ id: "s-today", date: TODAY }), // session exists but user didn't attend
    ];
    const result = computePlayerStats(rows, "u1", sessions, 8)!;

    for (let i = 0; i < result.weeklyData.length; i++) {
      const point = result.weeklyData[i]!;
      const raw = result.weeklyRaw[i]!;

      if (point.all === null) {
        // No sessions this week → raw shows "—"
        expect(raw.all).toBe("—");
        for (const type of result.weeklyTypes) {
          expect(point[type]).toBeNull();
          expect(raw[type]).toBe("—");
        }
      } else {
        // Sessions existed → percentage (0–100) and raw shows "X/Y"
        expect(typeof point.all).toBe("number");
        expect(raw.all).toMatch(/^\d+\/\d+$/);
      }
    }

    // Verify we actually have both null and non-null weeks
    expect(result.weeklyData.some((d) => d.all === null)).toBe(true);
    expect(result.weeklyData.some((d) => d.all !== null)).toBe(true);
  });
});
