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
