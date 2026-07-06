"use client";

import { useState, useMemo } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import type { EngagementData } from "../compute";
import { CHART_COLORS } from "../compute";

interface EngagementTableProps {
  data: EngagementData;
  types: string[];
  typeLabel: (type: string) => string;
}

export default function EngagementTable({ data, types, typeLabel }: EngagementTableProps) {
  const [sortKey, setSortKey] = useState<string>("count");
  const [sortAsc, setSortAsc] = useState(false);
  const [hideInactive, setHideInactive] = useState(false);

  const handleSort = (key: string) => {
    if (key === sortKey) setSortAsc((p) => !p);
    else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const sorted = useMemo(() => {
    let list = hideInactive ? data.attendees.filter((a) => a.isActive) : data.attendees;
    list = [...list].sort((a, b) => {
      let cmp: number;
      if (sortKey === "count") cmp = a.count - b.count;
      else if (sortKey === "name") cmp = a.name.localeCompare(b.name);
      else cmp = (a.typeCounts[sortKey] ?? 0) - (b.typeCounts[sortKey] ?? 0);
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [data.attendees, sortKey, sortAsc, hideInactive]);

  const arrow = (key: string) => (
    <span className={sortKey !== key ? " invisible" : ""}>{sortAsc ? " ↑" : " ↓"}</span>
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-foreground">{data.activeCount}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-muted-foreground">{data.inactiveCount}</p>
            <p className="text-xs text-muted-foreground">Inactive</p>
          </div>
        </div>
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={hideInactive} onCheckedChange={(c) => setHideInactive(!!c)} />
          Hide inactive
        </label>
      </div>

      {sorted.length > 0 && (
        <div className="overflow-auto max-h-80 -mx-4 px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-xs min-w-[400px]">
            <thead className="sticky top-0 bg-background z-10">
              <tr className="border-b">
                <th className="text-left py-1.5 pr-3 font-medium text-muted-foreground">
                  <button onClick={() => handleSort("name")} className="hover:text-foreground">
                    Name{arrow("name")}
                  </button>
                </th>
                <th className="text-right py-1.5 px-2 font-medium text-muted-foreground">
                  <button onClick={() => handleSort("count")} className="hover:text-foreground">
                    Total{arrow("count")}
                  </button>
                </th>
                {types.map((type, i) => (
                  <th key={type} className="text-right py-1.5 px-2 font-medium">
                    <button
                      onClick={() => handleSort(type)}
                      className="hover:text-foreground"
                      style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}
                    >
                      {typeLabel(type)}
                      {arrow(type)}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr
                  key={a.userId}
                  className={`border-b border-border/50 ${!a.isActive ? "opacity-50" : ""}`}
                >
                  <td className="py-1.5 pr-3 truncate max-w-[140px]">
                    {a.name}
                    {!a.isActive && (
                      <span className="ml-1 text-[10px] text-muted-foreground">(inactive)</span>
                    )}
                  </td>
                  <td className="text-right py-1.5 px-2 tabular-nums">
                    <span className="font-medium">{a.count}</span>
                    <span className="text-muted-foreground">/{data.totalSessions}</span>
                  </td>
                  {types.map((type) => (
                    <td key={type} className="text-right py-1.5 px-2 tabular-nums">
                      <span className="font-medium">{a.typeCounts[type] ?? 0}</span>
                      <span className="text-muted-foreground">
                        /{data.totalSessionsPerType[type] ?? 0}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
