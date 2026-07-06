"use client";

import { Checkbox } from "@/components/ui/checkbox";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { CHART_COLORS, LINE_COLOR_ALL } from "../compute";

// ── Types ────────────────────────────────────────────────────────

interface TrendChartProps {
  /** Chart data — each point has a key field + numeric fields per type + "all" */
  data: Array<Record<string, unknown>>;
  /** The data key for the X axis (e.g., "week") */
  xKey: string;
  /** Types to render as individual lines */
  types: string[];
  /** Which lines are currently visible */
  visibleLines: Set<string>;
  /** Toggle a line's visibility */
  onToggleLine: (key: string) => void;
  /** Map type value → display label */
  typeLabel: (type: string) => string;
  /** Format X axis tick labels */
  xFormatter: (value: unknown) => string;
  /** Optional: Y axis unit (e.g., "%") */
  yUnit?: string;
  /** Optional: Y axis domain */
  yDomain?: [number, number];
  /** Optional: custom tooltip value formatter */
  tooltipFormatter?: (
    value: unknown,
    name: unknown,
    props: { payload?: Record<string, unknown> },
  ) => string;
  /** Chart height class (default: "h-48") */
  heightClass?: string;
}

// ── Shared tooltip style ─────────────────────────────────────────

const TOOLTIP_CONTENT_STYLE = {
  borderRadius: 8,
  fontSize: 11,
  padding: "6px 10px",
  backgroundColor: "var(--popover)",
  borderColor: "var(--border)",
  color: "var(--popover-foreground)",
};

const TOOLTIP_LABEL_STYLE = {
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "underline" as const,
  marginBottom: 4,
};

// ── Component ────────────────────────────────────────────────────

export default function TrendChart({
  data,
  xKey,
  types,
  visibleLines,
  onToggleLine,
  typeLabel,
  xFormatter,
  yUnit,
  yDomain,
  tooltipFormatter,
  heightClass = "h-48",
}: TrendChartProps) {
  return (
    <div>
      {/* Legend checkboxes */}
      <div className="flex flex-wrap gap-3 pb-2">
        <label className="flex items-center gap-1.5 text-xs cursor-pointer">
          <Checkbox checked={visibleLines.has("all")} onCheckedChange={() => onToggleLine("all")} />
          <span className="font-medium" style={{ color: LINE_COLOR_ALL }}>
            All
          </span>
        </label>
        {types.map((type, i) => (
          <label key={type} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <Checkbox checked={visibleLines.has(type)} onCheckedChange={() => onToggleLine(type)} />
            <span className="font-medium" style={{ color: CHART_COLORS[i % CHART_COLORS.length] }}>
              {typeLabel(type)}
            </span>
          </label>
        ))}
      </div>

      {/* Chart */}
      <div className={heightClass}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
            <XAxis
              dataKey={xKey}
              tick={{ fontSize: 11 }}
              tickFormatter={xFormatter}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 11 }}
              className="text-muted-foreground"
              allowDecimals={false}
              unit={yUnit}
              domain={yDomain}
            />
            <Tooltip
              contentStyle={TOOLTIP_CONTENT_STYLE}
              labelStyle={TOOLTIP_LABEL_STYLE}
              labelFormatter={xFormatter}
              formatter={tooltipFormatter}
            />
            {visibleLines.has("all") && (
              <Line
                type="monotone"
                dataKey="all"
                name="All"
                stroke={LINE_COLOR_ALL}
                strokeWidth={2.5}
                dot={{ r: 3, fill: LINE_COLOR_ALL }}
                activeDot={{ r: 5 }}
              />
            )}
            {types.map((type, i) =>
              visibleLines.has(type) ? (
                <Line
                  key={type}
                  type="monotone"
                  dataKey={type}
                  name={typeLabel(type)}
                  stroke={CHART_COLORS[i % CHART_COLORS.length]}
                  strokeWidth={2}
                  dot={{ r: 2, fill: CHART_COLORS[i % CHART_COLORS.length] }}
                  activeDot={{ r: 4 }}
                />
              ) : null,
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
