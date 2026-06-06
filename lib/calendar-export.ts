import { SPORT_TIMEZONE } from "@/lib/timezone";
import { SESSION_STATUS } from "@/lib/supabase/types";
import type { SportSession } from "@/lib/supabase/types";

export interface CalendarExportOptions {
    /** Calendar display name (X-WR-CALNAME). */
    calendarName: string;
    /** Whether to include cancelled sessions (with STATUS:CANCELLED). */
    includeCancelled: boolean;
    /** Optional callback to generate a public URL for each session event. */
    buildSessionUrl?: (session: SportSession) => string | null;
}

/**
 * Converts an array of SportSession objects into a valid iCalendar string.
 * Pure function — no side effects or external dependencies beyond types.
 */
export function sessionsToIcal(
    sessions: SportSession[],
    options: CalendarExportOptions,
): string {
    const filtered = options.includeCancelled
        ? sessions
        : sessions.filter((s) => s.status !== SESSION_STATUS.cancelled);

    const events = filtered.map((s) => buildVEvent(s, options));

    return [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//NTCBC//Sports Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        `X-WR-CALNAME:${escapeText(options.calendarName)}`,
        `X-WR-TIMEZONE:${SPORT_TIMEZONE}`,
        ...events.flat(),
        "END:VCALENDAR",
    ].map(foldLine).join("\r\n");
}

function buildVEvent(session: SportSession, options: CalendarExportOptions): string[] {
    const dtStart = toIcalDateTime(session.date, session.time_start);
    const dtEnd = toIcalDateTime(session.date, session.time_end);
    const uid = `${session.id}@ntcbc-sports`;
    const summary = session.title || `${session.session_type} session`;
    const location = [session.location_name, session.location_address]
        .filter(Boolean)
        .join(", ");
    const sessionLink = options.buildSessionUrl?.(session) ?? null;

    const descriptionParts: string[] = [];
    if (session.notes) descriptionParts.push(session.notes);
    if (sessionLink) descriptionParts.push(`${sessionLink}`);
    const description = descriptionParts.join("\n\n");

    const lines: string[] = [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${formatUtcNow()}`,
        `DTSTART;TZID=${SPORT_TIMEZONE}:${dtStart}`,
        `DTEND;TZID=${SPORT_TIMEZONE}:${dtEnd}`,
        `SUMMARY:${escapeText(summary)}`,
    ];

    if (location) lines.push(`LOCATION:${escapeText(location)}`);
    if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
    if (sessionLink) lines.push(`URL:${sessionLink}`);
    if (session.status === SESSION_STATUS.cancelled) lines.push("STATUS:CANCELLED");

    lines.push("END:VEVENT");
    return lines;
}

/** Converts "YYYY-MM-DD" + "HH:MM" into iCal local datetime "YYYYMMDDTHHMMSS". */
function toIcalDateTime(date: string, time: string): string {
    const [year, month, day] = date.split("-");
    const [hour, minute] = time.split(":");
    return `${year}${month}${day}T${hour}${minute}00`;
}

/** Returns current UTC timestamp in iCal format. */
function formatUtcNow(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    const h = String(now.getUTCHours()).padStart(2, "0");
    const min = String(now.getUTCMinutes()).padStart(2, "0");
    const s = String(now.getUTCSeconds()).padStart(2, "0");
    return `${y}${m}${d}T${h}${min}${s}Z`;
}

/** Escapes special characters for iCalendar text values. */
function escapeText(text: string): string {
    return text
        .replace(/\\/g, "\\\\")
        .replace(/;/g, "\\;")
        .replace(/,/g, "\\,")
        .replace(/\n/g, "\\n");
}

/**
 * Folds a line per RFC 5545 §3.1: lines longer than 75 octets are split
 * with a CRLF followed by a single whitespace character (space).
 */
function foldLine(line: string): string {
    if (line.length <= 75) return line;
    const chunks: string[] = [];
    chunks.push(line.slice(0, 75));
    let i = 75;
    while (i < line.length) {
        chunks.push(" " + line.slice(i, i + 74));
        i += 74;
    }
    return chunks.join("\r\n");
}
