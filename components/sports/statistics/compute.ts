import type { SignupRow, SessionRow, CalendarUsageRow } from "@/lib/get-statistics";

// ── Date helpers (browser local time) ────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysAgoStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return localDateStr(d);
}

function weekStart(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return localDateStr(d);
}

// ── Chart formatters ─────────────────────────────────────────────

export function formatWeek(dateStr: unknown): string {
  const d = new Date(String(dateStr) + "T12:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function formatMonth(monthStr: unknown): string {
  const [, month] = String(monthStr).split("-");
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[parseInt(month!) - 1]}`;
}

// ── Time range ───────────────────────────────────────────────────

export const TIME_RANGES = [
  { label: "4W", weeks: 4 },
  { label: "8W", weeks: 8 },
  { label: "12W", weeks: 12 },
  { label: "6M", weeks: 26 },
  { label: "All", weeks: 0 },
] as const;

export type TimeRangeWeeks = (typeof TIME_RANGES)[number]["weeks"];

// ── Chart colors (CSS variables, theme-aware) ────────────────────

export const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
  "var(--muted-foreground)",
];
export const LINE_COLOR_ALL = "var(--foreground)";

// ── Trend data computation ───────────────────────────────────────

interface TrendPoint {
  week: string;
  [key: string]: number | string | null;
}

export interface TrendData {
  data: TrendPoint[];
  types: string[];
}

export function computeAttendanceTrend(
  rows: SignupRow[],
  sessions: SessionRow[],
  weeks: TimeRangeWeeks,
): TrendData {
  const allTypes = [...new Set(rows.map((r) => r.sessionType))].sort();
  const numWeeks =
    weeks ||
    Math.max(
      12,
      Math.ceil(
        (Date.now() -
          new Date((rows[0]?.sessionDate ?? localDateStr(new Date())) + "T12:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
  const cutoff = daysAgoStr(numWeeks * 7);

  const weekKeys: string[] = [];
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (numWeeks - 1 - i) * 7);
    weekKeys.push(weekStart(localDateStr(d)));
  }

  // Track which weeks have sessions per type
  const sessionsPerWeekType = new Map<string, Set<string>>();
  for (const wk of weekKeys) sessionsPerWeekType.set(wk, new Set());
  for (const s of sessions) {
    if (s.date >= cutoff) {
      const wk = weekStart(s.date);
      const weekSet = sessionsPerWeekType.get(wk);
      if (weekSet) weekSet.add(s.sessionType);
    }
  }

  const weekIndexMap = new Map(weekKeys.map((k, i) => [k, i]));
  const data: TrendPoint[] = weekKeys.map((week) => {
    const weekSessions = sessionsPerWeekType.get(week)!;
    const hasAnySessions = weekSessions.size > 0;
    const entry: TrendPoint = { week, all: hasAnySessions ? 0 : null };
    for (const type of allTypes) entry[type] = weekSessions.has(type) ? 0 : null;
    return entry;
  });

  for (const r of rows) {
    if (r.sessionDate >= cutoff) {
      const wk = weekStart(r.sessionDate);
      const idx = weekIndexMap.get(wk);
      if (idx != null) {
        (data[idx]!.all as number)++;
        (data[idx]![r.sessionType] as number)++;
      }
    }
  }

  return { data, types: allTypes };
}

// ── Summary stats ────────────────────────────────────────────────

export interface SummaryStats {
  totalSessions: number;
  uniqueAttendees: number;
  avgAttendance: number;
  avgFillRate: number | null;
}

export function computeSummary(rows: SignupRow[], sessionCount: number): SummaryStats {
  const uniqueAttendees = new Set(rows.map((r) => r.userId)).size;
  const avgAttendance = sessionCount > 0 ? rows.length / sessionCount : 0;

  const signupsBySession = new Map<string, { count: number; cap: number | null }>();
  for (const r of rows) {
    const existing = signupsBySession.get(r.sessionId);
    if (existing) existing.count++;
    else signupsBySession.set(r.sessionId, { count: 1, cap: r.playerCap });
  }
  const capped = [...signupsBySession.values()].filter((s) => s.cap != null && s.cap > 0);
  const avgFillRate =
    capped.length > 0 ? capped.reduce((sum, s) => sum + s.count / s.cap!, 0) / capped.length : null;

  return { totalSessions: sessionCount, uniqueAttendees, avgAttendance, avgFillRate };
}

// ── Session type breakdown ───────────────────────────────────────

export interface TypeStat {
  type: string;
  sessionCount: number;
  avgAttendance: number;
}

export function computeTypeStats(rows: SignupRow[]): TypeStat[] {
  const typeCounts = new Map<string, { sessions: Set<string>; signups: number }>();
  for (const r of rows) {
    const existing = typeCounts.get(r.sessionType);
    if (existing) {
      existing.sessions.add(r.sessionId);
      existing.signups++;
    } else {
      typeCounts.set(r.sessionType, { sessions: new Set([r.sessionId]), signups: 1 });
    }
  }
  return [...typeCounts.entries()].map(([type, { sessions, signups }]) => ({
    type,
    sessionCount: sessions.size,
    avgAttendance: sessions.size > 0 ? signups / sessions.size : 0,
  }));
}

// ── Engagement ───────────────────────────────────────────────────

interface Attendee {
  userId: string;
  name: string;
  count: number;
  typeCounts: Record<string, number>;
  isActive: boolean;
}

export interface EngagementData {
  activeCount: number;
  inactiveCount: number;
  attendees: Attendee[];
  totalSessions: number;
  totalSessionsPerType: Record<string, number>;
}

export function computeEngagement(
  rows: SignupRow[],
  sessionCount: number,
  totalSessionsByType: Map<string, number>,
  allUsers: Array<{ id: string; name: string }>,
): EngagementData {
  const allTypes = [...new Set(rows.map((r) => r.sessionType))].sort();
  const thirtyDaysAgo = daysAgoStr(30);
  const recentAttendees = new Set<string>();
  const attendeeCount = new Map<string, number>();

  for (const r of rows) {
    attendeeCount.set(r.userId, (attendeeCount.get(r.userId) ?? 0) + 1);
    if (r.sessionDate >= thirtyDaysAgo) recentAttendees.add(r.userId);
  }

  const activeCount = recentAttendees.size;
  const inactiveCount = allUsers.length - activeCount;

  const attendees = allUsers.map((user) => {
    const count = attendeeCount.get(user.id) ?? 0;
    const typeCounts: Record<string, number> = {};
    for (const type of allTypes) typeCounts[type] = 0;
    for (const r of rows) {
      if (r.userId === user.id) typeCounts[r.sessionType] = (typeCounts[r.sessionType] ?? 0) + 1;
    }
    return {
      userId: user.id,
      name: user.name,
      count,
      typeCounts,
      isActive: recentAttendees.has(user.id),
    };
  });

  const totalSessionsPerType: Record<string, number> = {};
  for (const type of allTypes) totalSessionsPerType[type] = totalSessionsByType.get(type) ?? 0;

  return {
    activeCount,
    inactiveCount,
    attendees,
    totalSessions: sessionCount,
    totalSessionsPerType,
  };
}

// ── Growth ───────────────────────────────────────────────────────

export interface GrowthPoint {
  month: string;
  newMembers: number;
}

export function computeGrowth(rows: SignupRow[]): GrowthPoint[] {
  const firstSignupByUser = new Map<string, string>();
  for (const r of rows) {
    const existing = firstSignupByUser.get(r.userId);
    if (!existing || r.sessionDate < existing) firstSignupByUser.set(r.userId, r.sessionDate);
  }

  const monthBuckets = new Map<string, number>();
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    monthBuckets.set(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`, 0);
  }

  for (const [, firstDate] of firstSignupByUser) {
    const key = firstDate.slice(0, 7);
    if (monthBuckets.has(key)) monthBuckets.set(key, monthBuckets.get(key)! + 1);
  }

  return [...monthBuckets.entries()].map(([month, newMembers]) => ({ month, newMembers }));
}

// ── Player stats ─────────────────────────────────────────────────

export interface PlayerStats {
  totalSignups: number;
  firstSession: string;
  lastSession: string;
  daysAgo: number;
  longestGap: number | null;
  avgFrequency: number | null;
  typeBreakdown: Array<{ type: string; count: number }>;
  weeklyData: Array<Record<string, number | string | null>>;
  weeklyRaw: Array<Record<string, string>>;
  weeklyTypes: string[];
}

export function computePlayerStats(
  rows: SignupRow[],
  userId: string,
  sessions: SessionRow[],
  weeks: TimeRangeWeeks,
): PlayerStats | null {
  const playerRows = rows
    .filter((r) => r.userId === userId)
    .sort((a, b) => a.sessionDate.localeCompare(b.sessionDate));
  if (playerRows.length === 0) return null;

  const totalSignups = playerRows.length;
  const firstSession = playerRows[0]!.sessionDate;
  const lastSession = playerRows[playerRows.length - 1]!.sessionDate;

  const now = new Date();
  const lastDate = new Date(lastSession + "T12:00:00");
  const daysAgo = Math.max(
    0,
    Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24)),
  );

  let longestGap = 0;
  let totalGapDays = 0;
  for (let i = 1; i < playerRows.length; i++) {
    const prev = new Date(playerRows[i - 1]!.sessionDate + "T12:00:00");
    const curr = new Date(playerRows[i]!.sessionDate + "T12:00:00");
    const gap = Math.floor((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
    totalGapDays += gap;
    if (gap > longestGap) longestGap = gap;
  }
  const avgFrequency =
    playerRows.length >= 2 ? Math.round(totalGapDays / (playerRows.length - 1)) : null;

  const typeCounts = new Map<string, number>();
  for (const r of playerRows)
    typeCounts.set(r.sessionType, (typeCounts.get(r.sessionType) ?? 0) + 1);
  const typeBreakdown = [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count);

  // Weekly attendance rate
  const playerTypes = [...typeCounts.keys()].sort();
  const numWeeks =
    weeks ||
    Math.max(
      12,
      Math.ceil(
        (now.getTime() - new Date(firstSession + "T12:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
  const chartWeekKeys: string[] = [];
  for (let i = 0; i < numWeeks; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (numWeeks - 1 - i) * 7);
    chartWeekKeys.push(weekStart(localDateStr(d)));
  }

  const sessionsPerWeekType = new Map<string, Map<string, number>>();
  for (const wk of chartWeekKeys) sessionsPerWeekType.set(wk, new Map());
  for (const s of sessions) {
    const wk = weekStart(s.date);
    const weekMap = sessionsPerWeekType.get(wk);
    if (weekMap) weekMap.set(s.sessionType, (weekMap.get(s.sessionType) ?? 0) + 1);
  }

  const signupsPerWeekType = new Map<string, Map<string, number>>();
  for (const wk of chartWeekKeys) signupsPerWeekType.set(wk, new Map());
  for (const r of playerRows) {
    const wk = weekStart(r.sessionDate);
    const weekMap = signupsPerWeekType.get(wk);
    if (weekMap) weekMap.set(r.sessionType, (weekMap.get(r.sessionType) ?? 0) + 1);
  }

  const weeklyRaw: Array<Record<string, string>> = [];
  const weeklyData: Array<Record<string, number | string | null>> = chartWeekKeys.map((wk) => {
    const available = sessionsPerWeekType.get(wk)!;
    const attended = signupsPerWeekType.get(wk)!;
    let totalAvailable = 0;
    let totalAttended = 0;
    const entry: Record<string, number | string | null> = { week: wk };
    const raw: Record<string, string> = {};

    for (const type of playerTypes) {
      const avail = available.get(type) ?? 0;
      const att = attended.get(type) ?? 0;
      totalAvailable += avail;
      totalAttended += att;
      entry[type] = avail > 0 ? Math.round((att / avail) * 100) : null;
      raw[type] = avail > 0 ? `${att}/${avail}` : "—";
    }
    entry.all = totalAvailable > 0 ? Math.round((totalAttended / totalAvailable) * 100) : null;
    raw.all = totalAvailable > 0 ? `${totalAttended}/${totalAvailable}` : "—";
    weeklyRaw.push(raw);
    return entry;
  });

  return {
    totalSignups,
    firstSession,
    lastSession,
    daysAgo,
    longestGap: playerRows.length >= 2 ? longestGap : null,
    avgFrequency,
    typeBreakdown,
    weeklyData,
    weeklyRaw,
    weeklyTypes: playerTypes,
  };
}

// ── Calendar usage stats ─────────────────────────────────────────

export interface CalendarUserEntry {
  mode: "subscribe" | "download";
  createdAt: string;
  lastUsedAt: string;
}

export interface CalendarUserRow {
  userName: string;
  /** All modes this user has used (1 or 2 entries). Sorted subscribe-first. */
  entries: CalendarUserEntry[];
  /** Most recent activity across all modes — used for sorting. */
  latestActivity: string;
}

export interface CalendarStats {
  totalSubscribers: number;
  activeSubscribers: number;
  totalDownloaders: number;
  /** Count of unique users who have used either subscribe or download. */
  uniqueUsers: number;
  /** Grouped by user — each user appears once with all their mode entries. */
  users: CalendarUserRow[];
}

/**
 * Computes calendar usage statistics from raw tracking rows.
 * A user may have both a subscribe and download row (independent entries).
 * "Active" subscribers are those whose subscription was polled in the last 7 days.
 */
export function computeCalendarStats(rows: CalendarUsageRow[]): CalendarStats {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const cutoff = sevenDaysAgo.toISOString();

  let totalSubscribers = 0;
  let activeSubscribers = 0;
  let totalDownloaders = 0;

  // Group by userId
  const userMap = new Map<
    string,
    { userName: string; entries: CalendarUserEntry[]; latestActivity: string }
  >();

  for (const row of rows) {
    if (row.mode === "subscribe") {
      totalSubscribers++;
      if (row.lastUsedAt >= cutoff) activeSubscribers++;
    } else {
      totalDownloaders++;
    }

    const existing = userMap.get(row.userId);
    const entry: CalendarUserEntry = {
      mode: row.mode,
      createdAt: row.createdAt,
      lastUsedAt: row.lastUsedAt,
    };

    if (existing) {
      existing.entries.push(entry);
      if (row.lastUsedAt > existing.latestActivity) {
        existing.latestActivity = row.lastUsedAt;
      }
    } else {
      userMap.set(row.userId, {
        userName: row.userName,
        entries: [entry],
        latestActivity: row.lastUsedAt,
      });
    }
  }

  // Sort users by most recent activity first; within each user sort entries subscribe-first
  const users = [...userMap.values()]
    .sort((a, b) => b.latestActivity.localeCompare(a.latestActivity))
    .map((u) => ({
      ...u,
      entries: u.entries.sort((a, b) => (a.mode === "subscribe" ? -1 : 1)),
    }));

  return {
    totalSubscribers,
    activeSubscribers,
    totalDownloaders,
    uniqueUsers: userMap.size,
    users,
  };
}

// ── Calendar attendance correlation (admin) ──────────────────────

export interface CalendarCorrelation {
  /** Average signups per calendar user */
  calendarUsersAvg: number;
  /** Average signups per non-calendar user */
  nonCalendarUsersAvg: number;
  /** Percentage difference (positive = calendar users attend more) */
  percentDiff: number | null;
  calendarUserCount: number;
  nonCalendarUserCount: number;
}

/**
 * Compares average attendance of users who use the calendar feature
 * vs those who don't. Helps admins assess whether the calendar drives engagement.
 */
export function computeCalendarCorrelation(
  signupRows: SignupRow[],
  calendarUsage: CalendarUsageRow[],
  allUsers: Array<{ id: string }>,
): CalendarCorrelation | null {
  if (allUsers.length === 0 || calendarUsage.length === 0) return null;

  const calendarUserIds = new Set(calendarUsage.map((r) => r.userId));

  // Count signups per user
  const signupsByUser = new Map<string, number>();
  for (const r of signupRows) {
    signupsByUser.set(r.userId, (signupsByUser.get(r.userId) ?? 0) + 1);
  }

  let calTotal = 0;
  let calCount = 0;
  let nonCalTotal = 0;
  let nonCalCount = 0;

  for (const user of allUsers) {
    const count = signupsByUser.get(user.id) ?? 0;
    if (calendarUserIds.has(user.id)) {
      calTotal += count;
      calCount++;
    } else {
      nonCalTotal += count;
      nonCalCount++;
    }
  }

  const calendarUsersAvg = calCount > 0 ? calTotal / calCount : 0;
  const nonCalendarUsersAvg = nonCalCount > 0 ? nonCalTotal / nonCalCount : 0;
  const percentDiff =
    nonCalendarUsersAvg > 0
      ? Math.round(((calendarUsersAvg - nonCalendarUsersAvg) / nonCalendarUsersAvg) * 100)
      : null;

  return {
    calendarUsersAvg: Math.round(calendarUsersAvg * 10) / 10,
    nonCalendarUsersAvg: Math.round(nonCalendarUsersAvg * 10) / 10,
    percentDiff,
    calendarUserCount: calCount,
    nonCalendarUserCount: nonCalCount,
  };
}
