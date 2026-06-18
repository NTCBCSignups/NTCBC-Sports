import { describe, expect, it } from "vitest";
import { sessionsToIcal } from "@/lib/calendar-export";
import { SESSION_STATUS, type SportSession } from "@/lib/supabase/types";
import { BASE_CALENDAR_SESSION } from "../fixtures/calendar";

describe("sessionsToIcal", () => {
  it("includes cancelled sessions with STATUS:CANCELLED when requested", () => {
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
