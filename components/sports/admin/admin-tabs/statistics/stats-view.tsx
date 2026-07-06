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

// ── Types ────────────────────────────────────────────────────────

export type StatsMode = "all" | "personal";

interface StatsViewProps {
  data: StatsData;
  /** "all" = admin view (all widgets), "personal" = user view (personal widgets only) */
  mode?: StatsMode;
  /** In personal mode, the userId whose data is shown */
  userId?: string;
  /** Title override (defaults to "Statistics" for all, "My Stats" for personal) */
  title?: string;
}

// ── Component ────────────────────────────────────────────────────

export default function StatsView({ data, mode = "all", userId, title }: StatsViewProps) {
  const isPersonal = mode === "personal";
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<TimeRangeWeeks>(12);
  const [selectedUserId, setSelectedUserId] = useState<string>(userId ?? "");
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
      trend: computeAttendanceTrend(rows, data.sessions, timeRange),
      typeStats: computeTypeStats(rows),
      engagement: computeEngagement(
        rows,
        sessionCount,
        totalSessionsByType,
        isPersonal
          ? data.signupRows.length > 0
            ? [{ id: data.signupRows[0]!.userId, name: data.signupRows[0]!.userName }]
            : []
          : data.users,
      ),
      growth: !isPersonal ? computeGrowth(rows) : null,
    };
  }, [data, typeFilter, timeRange, isPersonal]);

  // In personal mode, compute player stats from all signupRows (already user-scoped from server)
  // In trend mode, compute for the selected user from the picker
  const personalUserId = isPersonal ? (userId ?? data.signupRows[0]?.userId ?? "") : selectedUserId;

  const playerStats = useMemo(
    () =>
      personalUserId
        ? computePlayerStats(data.signupRows, personalUserId, data.sessions, timeRange)
        : null,
    [data.signupRows, data.sessions, personalUserId, timeRange],
  );

  // ── Summary cards — each declares its own scope ──────────────

  const summaryCards: Array<{ label: string; value: string | number; scope: StatsMode | "both" }> =
    useMemo(() => {
      const { totalSessions, uniqueAttendees, avgAttendance, avgFillRate } = filtered.summary;
      return [
        { label: "Total Sessions", value: totalSessions, scope: "both" as const },
        { label: "Unique Attendees", value: uniqueAttendees, scope: "all" as const },
        { label: "Avg Attendance", value: Math.round(avgAttendance), scope: "all" as const },
        {
          label: "Avg Fill Rate",
          value: avgFillRate != null ? `${Math.round(avgFillRate * 100)}%` : "—",
          scope: "all" as const,
        },
      ];
    }, [filtered.summary]);

  // ── Render ─────────────────────────────────────────────────────

  return (
    <section className="space-y-6">
      {/* Header: Title + Time Range + Type Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">
          {title ?? (isPersonal ? "My Stats" : "Statistics")}
        </h2>
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

      {/* Summary Cards — each declares its own scope */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {summaryCards
          .filter((c) => c.scope === "both" || c.scope === mode)
          .map((c) => (
            <StatCard key={c.label} label={c.label} value={c.value} />
          ))}
      </div>

      {/* Attendance Trend (trend scope — raw signup counts) */}
      {!isPersonal && (
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
      )}

      {/* Session Types */}
      {typeFilter === "all" && !isPersonal && filtered.typeStats.length > 1 && (
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

      {/* Personal: Player stats (in personal mode, shown directly; in trend mode, via PlayerLookup) */}
      {isPersonal && playerStats && (
        <PlayerLookup
          data={data}
          playerStats={playerStats}
          selectedUserId={personalUserId}
          onSelectUser={() => {}}
          visibleLines={visibleLines}
          onToggleLine={toggleLine}
          typeLabel={typeLabel}
          hideSearch
        />
      )}

      {/* Trend: Player Lookup (search any user) */}
      {!isPersonal && (
        <PlayerLookup
          data={data}
          playerStats={playerStats}
          selectedUserId={selectedUserId}
          onSelectUser={setSelectedUserId}
          visibleLines={visibleLines}
          onToggleLine={toggleLine}
          typeLabel={typeLabel}
        />
      )}

      {/* Engagement */}
      {filtered.engagement && (
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
      )}

      {/* Trend: Growth */}
      {!isPersonal && filtered.growth && (
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
      )}
    </section>
  );
}
