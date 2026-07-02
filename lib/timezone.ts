import { formatInTimeZone } from "date-fns-tz";

/**
 * League-wide default timezone. Used to decide when a session's `date`
 * (a calendar date with no time component) is considered "past" vs "upcoming".
 *
 * FUTURE: Sessions can take place in different timezones (e.g. away games,
 * tournaments out of province). To make this fully robust we should store a
 * `timezone` column on each session row, populated when the session is
 * created. The session form can prefill it from the browser via
 * `Intl.DateTimeFormat().resolvedOptions().timeZone` so admins rarely have to
 * touch it. Once that's in place, replace usages of this constant with
 * `session.timezone` at the relevant call sites.
 */
export const SPORT_TIMEZONE = "America/Toronto";

/**
 * Returns today's date as a `YYYY-MM-DD` string in {@link SPORT_TIMEZONE}.
 *
 * This matches the format Postgres uses for `date` columns and lets us do
 * lexicographic comparisons (`session.date >= today`) without ever
 * constructing a `Date` object. Using a timezone-aware boundary means a
 * session dated `2026-04-30` only flips to "past" at midnight Eastern,
 * not at midnight UTC (which would be 8 PM Eastern the night of the
 * session — making sessions disappear while they're still being played).
 */
export function getTodayInSportTimezone(): string {
  return formatInTimeZone(new Date(), SPORT_TIMEZONE, "yyyy-MM-dd");
}

/** Formats any Date as `YYYY-MM-DD` in {@link SPORT_TIMEZONE}. */
function getDateInSportTimezone(date: Date): string {
  return formatInTimeZone(date, SPORT_TIMEZONE, "yyyy-MM-dd");
}

/**
 * Parses a subscription anchor timestamp (epoch ms or ISO string) into a
 * `YYYY-MM-DD` sport-timezone date. Returns `undefined` when the input is
 * missing, invalid, or history mode makes the anchor irrelevant.
 */
export function resolveAnchoredFromDate(
  subscribedAt: string | null,
  includeHistory: boolean,
): string | undefined {
  if (includeHistory || !subscribedAt) return undefined;

  const parsedMs = Number(subscribedAt);
  const anchorDate = Number.isFinite(parsedMs) ? new Date(parsedMs) : new Date(subscribedAt);

  if (Number.isNaN(anchorDate.getTime())) return undefined;

  return getDateInSportTimezone(anchorDate);
}
