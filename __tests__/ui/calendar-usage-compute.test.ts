import { describe, it, expect } from "vitest";
import {
  computeCalendarStats,
  computeCalendarCorrelation,
} from "@/components/sports/statistics/compute";
import type { CalendarUsageRow, SignupRow } from "@/lib/get-statistics";

// ── Fixtures ─────────────────────────────────────────────────────

function makeCalendarRow(overrides: Partial<CalendarUsageRow> = {}): CalendarUsageRow {
  return {
    userId: "user-1",
    userName: "Alice",
    mode: "subscribe",
    createdAt: "2026-06-01T10:00:00.000Z",
    lastUsedAt: "2026-07-07T10:00:00.000Z",
    ...overrides,
  };
}

// ── computeCalendarStats ─────────────────────────────────────────

describe("computeCalendarStats", () => {
  it("returns zeros for empty data", () => {
    const result = computeCalendarStats([]);
    expect(result.totalSubscribers).toBe(0);
    expect(result.activeSubscribers).toBe(0);
    expect(result.totalDownloaders).toBe(0);
    expect(result.uniqueUsers).toBe(0);
    expect(result.rows).toHaveLength(0);
  });

  it("counts subscribers and downloaders separately", () => {
    const rows = [
      makeCalendarRow({ userId: "u1", userName: "Alice", mode: "subscribe" }),
      makeCalendarRow({ userId: "u2", userName: "Bob", mode: "subscribe" }),
      makeCalendarRow({ userId: "u3", userName: "Charlie", mode: "download" }),
    ];

    const result = computeCalendarStats(rows);
    expect(result.totalSubscribers).toBe(2);
    expect(result.totalDownloaders).toBe(1);
    expect(result.uniqueUsers).toBe(3);
  });

  it("identifies active subscribers (polled within last 7 days)", () => {
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 2);
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - 14);

    const rows = [
      makeCalendarRow({
        userId: "u1",
        userName: "Active User",
        mode: "subscribe",
        lastUsedAt: recentDate.toISOString(),
      }),
      makeCalendarRow({
        userId: "u2",
        userName: "Stale User",
        mode: "subscribe",
        lastUsedAt: staleDate.toISOString(),
      }),
    ];

    const result = computeCalendarStats(rows);
    expect(result.totalSubscribers).toBe(2);
    expect(result.activeSubscribers).toBe(1);
  });

  it("sorts rows by most recent activity first", () => {
    const rows = [
      makeCalendarRow({
        userId: "u1",
        userName: "Older",
        lastUsedAt: "2026-06-01T10:00:00.000Z",
      }),
      makeCalendarRow({
        userId: "u2",
        userName: "Newer",
        lastUsedAt: "2026-07-05T10:00:00.000Z",
      }),
    ];

    const result = computeCalendarStats(rows);
    expect(result.rows[0]!.userName).toBe("Newer");
    expect(result.rows[1]!.userName).toBe("Older");
  });

  it("does not mutate the original array", () => {
    const rows = [
      makeCalendarRow({ userId: "u1", lastUsedAt: "2026-06-01T10:00:00.000Z" }),
      makeCalendarRow({ userId: "u2", lastUsedAt: "2026-07-05T10:00:00.000Z" }),
    ];
    const originalFirst = rows[0];

    computeCalendarStats(rows);
    expect(rows[0]).toBe(originalFirst);
  });

  it("handles a user with both subscribe and download as separate entries", () => {
    const rows = [
      makeCalendarRow({ userId: "u1", userName: "Alice", mode: "subscribe" }),
      makeCalendarRow({ userId: "u1", userName: "Alice", mode: "download" }),
    ];

    const result = computeCalendarStats(rows);
    expect(result.totalSubscribers).toBe(1);
    expect(result.totalDownloaders).toBe(1);
    expect(result.uniqueUsers).toBe(1); // same user, counted once
    expect(result.rows).toHaveLength(2); // but both entries shown in table
  });

  it("boundary: subscriber active exactly 7 days ago is not active", () => {
    const exactlySeven = new Date();
    exactlySeven.setDate(exactlySeven.getDate() - 7);
    // Subtract 1ms to ensure it's beyond the cutoff
    exactlySeven.setMilliseconds(exactlySeven.getMilliseconds() - 1);

    const rows = [
      makeCalendarRow({
        userId: "u1",
        mode: "subscribe",
        lastUsedAt: exactlySeven.toISOString(),
      }),
    ];

    const result = computeCalendarStats(rows);
    expect(result.totalSubscribers).toBe(1);
    expect(result.activeSubscribers).toBe(0);
  });
});

// ── computeCalendarCorrelation ───────────────────────────────────

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

describe("computeCalendarCorrelation", () => {
  it("returns null when no calendar usage", () => {
    const users = [{ id: "u1" }, { id: "u2" }];
    const signups = [makeSignupRow({ userId: "u1" })];
    const result = computeCalendarCorrelation(signups, [], users);
    expect(result).toBeNull();
  });

  it("returns null when no users", () => {
    const calUsage = [makeCalendarRow({ userId: "u1" })];
    const result = computeCalendarCorrelation([], calUsage, []);
    expect(result).toBeNull();
  });

  it("computes higher average for calendar users", () => {
    const users = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
    // u1 (calendar user): 5 signups
    // u2, u3 (non-calendar): 1 signup each
    const signups = [
      ...Array.from({ length: 5 }, (_, i) => makeSignupRow({ userId: "u1", sessionId: `s${i}` })),
      makeSignupRow({ userId: "u2", sessionId: "s10" }),
      makeSignupRow({ userId: "u3", sessionId: "s11" }),
    ];
    const calUsage = [makeCalendarRow({ userId: "u1", mode: "subscribe" })];

    const result = computeCalendarCorrelation(signups, calUsage, users);
    expect(result).not.toBeNull();
    expect(result!.calendarUsersAvg).toBe(5);
    expect(result!.nonCalendarUsersAvg).toBe(1);
    expect(result!.percentDiff).toBe(400); // +400%
    expect(result!.calendarUserCount).toBe(1);
    expect(result!.nonCalendarUserCount).toBe(2);
  });

  it("handles user with both subscribe and download (counted once as calendar user)", () => {
    const users = [{ id: "u1" }, { id: "u2" }];
    const signups = [
      makeSignupRow({ userId: "u1", sessionId: "s1" }),
      makeSignupRow({ userId: "u1", sessionId: "s2" }),
      makeSignupRow({ userId: "u2", sessionId: "s3" }),
    ];
    const calUsage = [
      makeCalendarRow({ userId: "u1", mode: "subscribe" }),
      makeCalendarRow({ userId: "u1", mode: "download" }),
    ];

    const result = computeCalendarCorrelation(signups, calUsage, users);
    expect(result!.calendarUserCount).toBe(1);
    expect(result!.nonCalendarUserCount).toBe(1);
    expect(result!.calendarUsersAvg).toBe(2);
    expect(result!.nonCalendarUsersAvg).toBe(1);
  });

  it("returns null percentDiff when no non-calendar users", () => {
    const users = [{ id: "u1" }];
    const signups = [makeSignupRow({ userId: "u1" })];
    const calUsage = [makeCalendarRow({ userId: "u1" })];

    const result = computeCalendarCorrelation(signups, calUsage, users);
    expect(result!.percentDiff).toBeNull();
  });

  it("includes users with zero signups in averages", () => {
    const users = [{ id: "u1" }, { id: "u2" }, { id: "u3" }];
    // u1 (calendar): 0 signups
    // u2 (no calendar): 3 signups
    // u3 (no calendar): 0 signups
    const signups = [
      makeSignupRow({ userId: "u2", sessionId: "s1" }),
      makeSignupRow({ userId: "u2", sessionId: "s2" }),
      makeSignupRow({ userId: "u2", sessionId: "s3" }),
    ];
    const calUsage = [makeCalendarRow({ userId: "u1" })];

    const result = computeCalendarCorrelation(signups, calUsage, users);
    expect(result!.calendarUsersAvg).toBe(0);
    expect(result!.nonCalendarUsersAvg).toBe(1.5);
    expect(result!.percentDiff).toBe(-100); // -100%
  });
});
