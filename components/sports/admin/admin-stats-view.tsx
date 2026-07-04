"use client";

import { Badge } from "@/components/ui/badge";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import type { SportStatistics } from "@/lib/get-statistics";

interface AdminStatsViewProps {
  stats: SportStatistics;
}

export default function AdminStatsView({ stats }: AdminStatsViewProps) {
  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold text-foreground">Statistics</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Sessions" value={stats.summary.totalSessions} />
        <StatCard label="Unique Attendees" value={stats.summary.uniqueAttendees} />
        <StatCard
          label="Avg Attendance"
          value={stats.summary.avgAttendance.toFixed(1)}
        />
        <StatCard
          label="Avg Fill Rate"
          value={
            stats.summary.avgFillRate != null
              ? `${Math.round(stats.summary.avgFillRate * 100)}%`
              : "—"
          }
        />
      </div>

      {/* Attendance Trend */}
      <CollapsibleSection title="Attendance Trend" description="Signups per week (last 12 weeks)" defaultOpen>
        <div className="h-48 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={stats.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11 }}
                tickFormatter={formatWeek}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                labelFormatter={formatWeek}
              />
              <Line
                type="monotone"
                dataKey="count"
                name="Signups"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>

      {/* Session Type Popularity */}
      {stats.sessionTypeStats.length > 1 && (
        <CollapsibleSection title="Session Types" description="Average attendance by type" defaultOpen>
          <div className="h-48 pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.sessionTypeStats}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="type" tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
                <Tooltip contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="avgAttendance" name="Avg Attendance" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CollapsibleSection>
      )}

      {/* Member Engagement */}
      <CollapsibleSection title="Engagement" description="Active vs inactive (last 30 days)" defaultOpen>
        <div className="flex flex-col sm:flex-row gap-6 pt-4">
          <div className="flex gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{stats.engagement.activeCount}</p>
              <p className="text-xs text-muted-foreground">Active</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-muted-foreground">{stats.engagement.inactiveCount}</p>
              <p className="text-xs text-muted-foreground">Inactive</p>
            </div>
          </div>
          {stats.engagement.topAttendees.length > 0 && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground mb-2">Top Attendees</p>
              <div className="space-y-1">
                {stats.engagement.topAttendees.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="truncate">{a.name}</span>
                    <Badge variant="secondary" className="ml-2 tabular-nums">
                      {a.count}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CollapsibleSection>

      {/* Growth */}
      <CollapsibleSection title="Growth" description="New members per month (last 6 months)" defaultOpen>
        <div className="h-40 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.growth}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 11 }}
                tickFormatter={formatMonth}
                className="text-muted-foreground"
              />
              <YAxis tick={{ fontSize: 11 }} className="text-muted-foreground" />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                labelFormatter={formatMonth}
              />
              <Bar dataKey="newMembers" name="New Members" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CollapsibleSection>
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
  );
}

// ── Formatters ───────────────────────────────────────────────────

function formatWeek(dateStr: unknown): string {
  const d = new Date(String(dateStr));
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatMonth(monthStr: unknown): string {
  const [year, month] = String(monthStr).split("-");
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[parseInt(month!) - 1]} ${year!.slice(2)}`;
}
