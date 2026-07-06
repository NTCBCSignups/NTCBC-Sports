"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import type { StatsData } from "@/lib/get-statistics";
import {
  TIME_RANGES,
  type TimeRangeWeeks,
  formatWeek,
  formatMonth,
  computeAttendanceTrend,
  computeSummary,
  computeTypeStats,
  computeEngagement,
  computeGrowth,
  computePlayerStats,
  CHART_COLORS,
} from "./compute";
import StatCard from "./components/stat-card";
import TrendChart from "./components/trend-chart";
import EngagementTable from "./components/engagement-table";
import PlayerLookup from "./components/player-lookup";

// ── Component ────────────────────────────────────────────────────

export default function StatsView({ data }: { data: StatsData }) {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRangeWeeks>(12);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [visibleLines, setVisibleLines] = useState<Set<string>>(new Set(["all"]));

  const typeLabel = useCallback((type: string) => data.typeLabels[type] ?? type, [data.typeLabels]);

  const sessionTypes = useMemo(
    () => [...new Set(data.sessions.map((s) => s.sessionType))].sort(),
    [data.sessions],
  );

  // Initialize visible lines — all types checked, "all" unchecked
  useEffect(() => {
    setVisibleLines(new Set(sessionTypes));
  }, [sessionTypes]);

  const toggleLine = useCallback((key: string) => {
    setVisibleLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  // ── Derived data (all computation happens here) ──────────────

  const filtered = useMemo(() => {
    const rows =
      typeFilter === "all"
        ? data.signupRows
        : data.signupRows.filter((r) => r.sessionType === typeFilter);
    const sessionCount =
      typeFilter === "all"
        ? data.sessions.length
        : data.sessions.filter((s) => s.sessionType === typeFilter).length;

    const totalSessionsByType = new Map<string, number>();
    for (const s of data.sessions) {
      totalSessionsByType.set(s.sessionType, (totalSessionsByType.get(s.sessionType) ?? 0) + 1);
    }

    return {
      summary: computeSummary(rows, sessionCount),
      trend: computeAttendanceTrend(rows, timeRange),
      typeStats: computeTypeStats(rows),
      engagement: computeEngagement(rows, sessionCount, totalSessionsByType, data.users),
      growth: computeGrowth(rows),
    };
  }, [data, typeFilter, timeRange]);

  const playerStats = useMemo(
    () =>
      selectedUserId
        ? computePlayerStats(data.signupRows, selectedUserId, data.sessions, timeRange)
        : null,
    [data.signupRows, data.sessions, selectedUserId, timeRange],
  );

  // ── Render ─────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      {/* Header: Title + Time Range + Type Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">Statistics</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border overflow-hidden shrink-0">
            {TIME_RANGES.map((r) => (
              <button
                key={r.weeks}
                onClick={() => setTimeRange(r.weeks)}
                className={`px-2 py-1 text-xs font-medium transition-colors ${
                  timeRange === r.weeks
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          {sessionTypes.length > 1 && (
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {sessionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {typeLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Sessions" value={filtered.summary.totalSessions} />
        <StatCard label="Unique Attendees" value={filtered.summary.uniqueAttendees} />
        <StatCard label="Avg Attendance" value={Math.round(filtered.summary.avgAttendance)} />
        <StatCard
          label="Avg Fill Rate"
          value={
            filtered.summary.avgFillRate != null
              ? `${Math.round(filtered.summary.avgFillRate * 100)}%`
              : "—"
          }
        />
      </div>

      {/* Attendance Trend */}
      <CollapsibleSection title="Attendance Trend" description="Signups per week" defaultOpen>
        <div className="pt-3">
          <TrendChart
            data={filtered.trend.data}
            xKey="week"
            types={filtered.trend.types}
            visibleLines={visibleLines}
            onToggleLine={toggleLine}
            typeLabel={typeLabel}
            xFormatter={formatWeek}
          />
        </div>
      </CollapsibleSection>

      {/* Session Types */}
      {typeFilter === "all" && filtered.typeStats.length > 1 && (
        <CollapsibleSection
          title="Session Types"
          description="Average attendance by type"
          defaultOpen
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            {filtered.typeStats.map((s, i) => (
              <div key={s.type} className="rounded-lg border bg-card p-3">
                <p className="text-xs text-muted-foreground truncate">{typeLabel(s.type)}</p>
                <p
                  className="text-xl font-bold mt-0.5"
                  style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                >
                  {Math.round(s.avgAttendance)}
                </p>
                <p className="text-[11px] text-muted-foreground">{s.sessionCount} sessions</p>
              </div>
            ))}
          </div>
        </CollapsibleSection>
      )}

      {/* Player Lookup */}
      <PlayerLookup
        data={data}
        playerStats={playerStats}
        selectedUserId={selectedUserId}
        onSelectUser={setSelectedUserId}
        visibleLines={visibleLines}
        onToggleLine={toggleLine}
        typeLabel={typeLabel}
      />

      {/* Engagement */}
      <CollapsibleSection
        title="Engagement"
        description="Active vs inactive (last 30 days)"
        defaultOpen
      >
        <div className="pt-4">
          <EngagementTable
            data={filtered.engagement}
            types={filtered.trend.types}
            typeLabel={typeLabel}
          />
        </div>
      </CollapsibleSection>

      {/* Growth */}
      <CollapsibleSection
        title="Growth"
        description="New members per month (last 6 months)"
        defaultOpen
      >
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 pt-4">
          {filtered.growth.map((g) => (
            <div key={g.month} className="rounded-lg border bg-card p-2.5 text-center">
              <p className="text-xs text-muted-foreground">{formatMonth(g.month)}</p>
              <p className="text-lg font-bold text-foreground">{g.newMembers}</p>
            </div>
          ))}
        </div>
      </CollapsibleSection>
    </section>
  );
}
