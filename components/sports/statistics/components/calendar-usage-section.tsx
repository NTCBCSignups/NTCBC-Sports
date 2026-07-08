import { CalendarDays, Rss, Download } from "lucide-react";
import type { CalendarStats } from "../compute";

interface CalendarUsageSectionProps {
  stats: CalendarStats;
}

export default function CalendarUsageSection({ stats }: CalendarUsageSectionProps) {
  if (stats.totalSubscribers === 0 && stats.totalDownloaders === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No calendar usage recorded yet.
      </p>
    );
  }

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
          <p className="text-xl font-bold text-foreground mt-1">
            {new Set(stats.rows.map((r) => r.userName)).size}
          </p>
        </div>
      </div>

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
          <tbody className="divide-y">
            {stats.rows.map((row, i) => (
              <tr key={i} className="hover:bg-muted/30">
                <td className="px-3 py-2 text-foreground">{row.userName}</td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                      row.mode === "subscribe"
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                        : "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300"
                    }`}
                  >
                    {row.mode === "subscribe" ? (
                      <Rss className="h-3 w-3" />
                    ) : (
                      <Download className="h-3 w-3" />
                    )}
                    {row.mode === "subscribe" ? "Subscription" : "Download"}
                  </span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {formatRelative(row.lastUsedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
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
