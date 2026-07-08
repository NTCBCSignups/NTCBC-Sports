import { CalendarDays, Rss, Download, TrendingUp, TrendingDown } from "lucide-react";
import type { CalendarStats, CalendarCorrelation, CalendarUserEntry } from "../compute";

interface CalendarUsageSectionProps {
  stats: CalendarStats;
  isPersonal?: boolean;
  correlation?: CalendarCorrelation | null;
}

export default function CalendarUsageSection({
  stats,
  isPersonal,
  correlation,
}: CalendarUsageSectionProps) {
  if (stats.totalSubscribers === 0 && stats.totalDownloaders === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        {isPersonal
          ? "You haven't used the calendar feature yet. Try subscribing or downloading from the calendar button!"
          : "No calendar usage recorded yet."}
      </p>
    );
  }

  // Personal mode: compact view of user's own calendar status
  if (isPersonal) {
    const entries = stats.users.flatMap((u) => u.entries);
    return (
      <div className="space-y-3 pt-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {entries.map((entry, i) => (
            <div key={i} className="rounded-lg border bg-card p-3">
              <div className="flex items-center gap-2">
                {entry.mode === "subscribe" ? (
                  <Rss className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                ) : (
                  <Download className="h-4 w-4 text-green-600 dark:text-green-400" />
                )}
                <p className="text-sm font-medium text-foreground">
                  {entry.mode === "subscribe" ? "Calendar Subscription" : "Calendar Download"}
                </p>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-muted-foreground">
                  First used: <span className="text-foreground">{formatDate(entry.createdAt)}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  Last active:{" "}
                  <span className="text-foreground">{formatRelative(entry.lastUsedAt)}</span>
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Admin mode: full stats + correlation insight + user table
  return (
    <div className="space-y-4 pt-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <Rss className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Active Subscribers</p>
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{stats.activeSubscribers}</p>
          <p className="text-[11px] text-muted-foreground">{stats.totalSubscribers} total</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <Download className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Downloads</p>
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{stats.totalDownloaders}</p>
        </div>
        <div className="rounded-lg border bg-card p-3">
          <div className="flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          <p className="text-xl font-bold text-foreground mt-1">{stats.uniqueUsers}</p>
        </div>
      </div>

      {/* Correlation insight */}
      {correlation && <CorrelationInsight correlation={correlation} />}

      {/* User list */}
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                User
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                Type
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                First Used
              </th>
              <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">
                Last Active
              </th>
            </tr>
          </thead>
          {stats.users.map((user) => (
            <tbody key={user.userName} className="border-t hover:bg-muted/30">
              {user.entries.map((entry, entryIdx) => (
                <tr key={entry.mode}>
                  {entryIdx === 0 ? (
                    <td
                      className="px-3 py-2 text-foreground align-top"
                      rowSpan={user.entries.length}
                    >
                      {user.userName}
                    </td>
                  ) : null}
                  <td className="px-3 py-2">
                    <ModeBadge entry={entry} />
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{formatDate(entry.createdAt)}</td>
                  <td className="px-3 py-2">
                    <LastActive iso={entry.lastUsedAt} />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}

// ── Correlation insight card ─────────────────────────────────────

function CorrelationInsight({ correlation }: { correlation: CalendarCorrelation }) {
  const {
    calendarUsersAvg,
    nonCalendarUsersAvg,
    percentDiff,
    calendarUserCount,
    nonCalendarUserCount,
  } = correlation;

  const isPositive = percentDiff !== null && percentDiff > 0;
  const isSignificant = percentDiff !== null && Math.abs(percentDiff) >= 10;

  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-start gap-2">
        {isPositive ? (
          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
        ) : (
          <TrendingDown className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
        )}
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Calendar &amp; Attendance Correlation
          </p>
          <p className="text-xs text-muted-foreground">
            Calendar users average{" "}
            <span className="font-medium text-foreground">{calendarUsersAvg}</span> signups vs{" "}
            <span className="font-medium text-foreground">{nonCalendarUsersAvg}</span> for
            non-calendar users
            {percentDiff !== null && (
              <span
                className={
                  isSignificant && isPositive
                    ? "text-green-600 dark:text-green-400 font-medium"
                    : ""
                }
              >
                {" "}
                ({isPositive ? "+" : ""}
                {percentDiff}%)
              </span>
            )}
          </p>
          <p className="text-[11px] text-muted-foreground">
            Based on {calendarUserCount} calendar user{calendarUserCount !== 1 ? "s" : ""} and{" "}
            {nonCalendarUserCount} non-calendar user{nonCalendarUserCount !== 1 ? "s" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────

function ModeBadge({ entry }: { entry: CalendarUserEntry }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
        entry.mode === "subscribe"
          ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
          : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
      }`}
    >
      {entry.mode === "subscribe" ? <Rss className="h-3 w-3" /> : <Download className="h-3 w-3" />}
      {entry.mode === "subscribe" ? "Subscription" : "Download"}
    </span>
  );
}

function LastActive({ iso }: { iso: string }) {
  const diffDays = Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  const isStale = diffDays >= 7;

  return (
    <span className={isStale ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
      {formatRelative(iso)}
    </span>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelative(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(iso);
}
