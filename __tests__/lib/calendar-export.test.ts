import { describe, expect, it } from "vitest";
import { sessionsToIcal } from "@/lib/calendar-export";
import { resolveAnchoredFromDate } from "@/lib/timezone";
import { SESSION_STATUS, type SportSession } from "@/lib/supabase/types";
import { BASE_CALENDAR_SESSION } from "../fixtures/calendar";

// ── sessionsToIcal ───────────────────────────────────────────────

describe("sessionsToIcal", () => {
  it("includes cancelled sessions with STATUS:CANCELLED and SEQUENCE:1", () => {
    const cancelledSession: SportSession = {
      ...BASE_CALENDAR_SESSION,
      id: "session-2",
      status: SESSION_STATUS.cancelled,
    };

    const ical = sessionsToIcal([cancelledSession], {
      calendarName: "NTCBC Softball Sessions",
      includeCancelled: true,
    });

    expect(ical).toContain("BEGIN:VEVENT");
    expect(ical).toContain("UID:session-2@ntcbc-sports");
    expect(ical).toContain("STATUS:CANCELLED");
    expect(ical).toContain("SEQUENCE:1");
  });

  it("active sessions have SEQUENCE:0 and no STATUS line", () => {
    const ical = sessionsToIcal([BASE_CALENDAR_SESSION], {
      calendarName: "NTCBC Softball Sessions",
      includeCancelled: true,
    });

    expect(ical).toContain("SEQUENCE:0");
    expect(ical).not.toContain("STATUS:");
  });

  it("excludes cancelled sessions when includeCancelled is false", () => {
    const activeSession: SportSession = {
      ...BASE_CALENDAR_SESSION,
      id: "session-active",
      status: SESSION_STATUS.active,
    };
    const cancelledSession: SportSession = {
      ...BASE_CALENDAR_SESSION,
      id: "session-cancelled",
      status: SESSION_STATUS.cancelled,
    };

    const ical = sessionsToIcal([activeSession, cancelledSession], {
      calendarName: "NTCBC Softball Sessions",
      includeCancelled: false,
    });

    expect(ical).toContain("UID:session-active@ntcbc-sports");
    expect(ical).not.toContain("UID:session-cancelled@ntcbc-sports");
  });
});

// ── resolveAnchoredFromDate ──────────────────────────────────────

describe("resolveAnchoredFromDate", () => {
  it("returns undefined when subscribedAt is null", () => {
    expect(resolveAnchoredFromDate(null, false)).toBeUndefined();
  });

  it("returns undefined when includeHistory is true", () => {
    expect(resolveAnchoredFromDate("1718672400000", true)).toBeUndefined();
  });

  it("parses epoch milliseconds into a YYYY-MM-DD date", () => {
    // 2026-06-18T00:00:00Z
    const result = resolveAnchoredFromDate("1781827200000", false);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("parses ISO date string into a YYYY-MM-DD date", () => {
    const result = resolveAnchoredFromDate("2026-06-18T12:00:00Z", false);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns undefined for invalid input", () => {
    expect(resolveAnchoredFromDate("not-a-date", false)).toBeUndefined();
  });
});
