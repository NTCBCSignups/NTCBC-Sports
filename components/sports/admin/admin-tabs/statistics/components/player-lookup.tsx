"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import TrendChart from "./trend-chart";
import { MiniStat } from "./stat-card";
import { formatWeek, type PlayerStats } from "../compute";
import type { StatsData } from "@/lib/get-statistics";

interface PlayerLookupProps {
  data: StatsData;
  playerStats: PlayerStats | null;
  selectedUserId: string;
  onSelectUser: (userId: string) => void;
  visibleLines: Set<string>;
  onToggleLine: (key: string) => void;
  typeLabel: (type: string) => string;
}

export default function PlayerLookup({
  data,
  playerStats,
  selectedUserId,
  onSelectUser,
  visibleLines,
  onToggleLine,
  typeLabel,
}: PlayerLookupProps) {
  const [search, setSearch] = useState("");

  const filteredUsers = useMemo(() => {
    if (!search) return data.users.slice(0, 10);
    const q = search.toLowerCase();
    return data.users.filter((u) => u.name.toLowerCase().includes(q)).slice(0, 20);
  }, [data.users, search]);

  const selectedUserName = data.users.find((u) => u.id === selectedUserId)?.name ?? "";

  const tooltipFormatter = useMemo(() => {
    if (!playerStats) return undefined;
    return (value: unknown, name: unknown, props: { payload?: Record<string, unknown> }) => {
      const week = props.payload?.week as string | undefined;
      if (!week) return `${value}%`;
      const idx = playerStats.weeklyData.findIndex((d) => d.week === week);
      const key = String(
        name === "All"
          ? "all"
          : (playerStats.weeklyTypes.find((t) => typeLabel(t) === name) ?? name),
      );
      return idx >= 0 ? (playerStats.weeklyRaw[idx]![key] ?? `${value}%`) : `${value}%`;
    };
  }, [playerStats, typeLabel]);

  return (
    <CollapsibleSection
      title="Player Lookup"
      description="View individual attendance patterns"
      defaultOpen
    >
      <div className="pt-4 space-y-3">
        {/* Search with inline dropdown */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!e.target.value) onSelectUser("");
            }}
            className="pl-9"
          />
          {search.length >= 1 && filteredUsers.length > 0 && !selectedUserId && (
            <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md max-h-48 overflow-y-auto">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    onSelectUser(u.id);
                    setSearch(u.name);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                >
                  {u.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Inline stats */}
        {playerStats ? (
          <div className="rounded-lg border bg-card p-4 space-y-4">
            <p className="text-sm font-semibold text-foreground">{selectedUserName}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <MiniStat label="Total Signups" value={playerStats.totalSignups} />
              <MiniStat
                label="Last Signup"
                value={playerStats.daysAgo === 0 ? "Today" : `${playerStats.daysAgo}d ago`}
              />
              <MiniStat
                label="Avg Frequency"
                value={playerStats.avgFrequency != null ? `${playerStats.avgFrequency}d` : "—"}
              />
              <MiniStat
                label="Longest Gap"
                value={playerStats.longestGap != null ? `${playerStats.longestGap}d` : "—"}
              />
            </div>

            {playerStats.typeBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">Session Types</p>
                <div className="flex flex-wrap gap-1.5">
                  {playerStats.typeBreakdown.map((t) => (
                    <Badge key={t.type} variant="secondary">
                      {typeLabel(t.type)}: {t.count}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly attendance rate chart */}
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                Attendance Rate (% per week)
              </p>
              <TrendChart
                data={playerStats.weeklyData as Array<Record<string, unknown>>}
                xKey="week"
                types={playerStats.weeklyTypes}
                visibleLines={visibleLines}
                onToggleLine={onToggleLine}
                typeLabel={typeLabel}
                xFormatter={formatWeek}
                yUnit="%"
                yDomain={[0, 100]}
                tooltipFormatter={tooltipFormatter}
                heightClass="h-40"
              />
            </div>

            <p className="text-xs text-muted-foreground">
              First: {playerStats.firstSession} · Last: {playerStats.lastSession}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Search and select a person to view their stats
          </div>
        )}
      </div>
    </CollapsibleSection>
  );
}
