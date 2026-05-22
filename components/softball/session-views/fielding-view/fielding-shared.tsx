"use client";

import { Fragment } from "react";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/format";
import {
    ALL_POSITIONS,
    DIAMOND_POSITIONS,
    OFFENSIVE_KEYS,
    OUTFIELD_KEYS,
    POSITION_GROUPS,
} from "./fielding-data";

// ── Diamond SVG ──────────────────────────────────────────────────

export function FieldingDiamond({
    assignments,
    highlightUserId,
    getUserName,
}: {
    assignments: Record<string, string | null>;
    highlightUserId?: string | null;
    getUserName: (userId: string) => string;
}) {
    return (
        <div className="w-full max-w-sm mx-auto">
            <svg viewBox="0 0 100 100" overflow="visible" className="w-full h-auto">
                {/* Infield/outfield boundary arc */}
                <path
                    d="M 5 40 A 106 106 0 0 1 95 40"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-muted-foreground/30"
                />
                {/* Diamond */}
                <polygon
                    points="50,86 78,62 50,38 22,62"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-muted-foreground/50"
                />
                {/* Bases */}
                <rect x="48.5" y="84.5" width="3" height="3" className="fill-muted-foreground/60" /> {/* Home */}
                <rect x="76.5" y="60.5" width="3" height="3" transform="rotate(45 78 62)" className="fill-muted-foreground/60" /> {/* 1st */}
                <rect x="48.5" y="36.5" width="3" height="3" transform="rotate(45 50 38)" className="fill-muted-foreground/60" /> {/* 2nd */}
                <rect x="20.5" y="60.5" width="3" height="3" transform="rotate(45 22 62)" className="fill-muted-foreground/60" /> {/* 3rd */}
                {/* Position markers */}
                {Object.entries(DIAMOND_POSITIONS).map(([posKey, pos]) => {
                    const userId = assignments[posKey];
                    const isHighlighted = highlightUserId && userId === highlightUserId;
                    const posInfo = ALL_POSITIONS.find((p) => p.key === posKey);
                    const short = posInfo?.short ?? posKey;
                    const isOffensive = OFFENSIVE_KEYS.has(posKey);
                    const isOutfield = OUTFIELD_KEYS.has(posKey);

                    const circleClass = isHighlighted
                        ? "fill-primary stroke-primary"
                        : isOffensive
                            ? userId
                                ? "fill-red-400/60 stroke-red-500/70"
                                : "fill-red-400/20 stroke-red-500/30"
                            : userId
                                ? isOutfield
                                    ? "fill-emerald-400/70 stroke-emerald-500/80"
                                    : "fill-amber-400/70 stroke-amber-500/80"
                                : isOutfield
                                    ? "fill-emerald-400/20 stroke-emerald-500/30"
                                    : "fill-amber-400/20 stroke-amber-500/30";

                    return (
                        <g key={posKey} className={isOffensive ? "opacity-70" : ""}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isHighlighted ? 2.5 : 2}
                                className={circleClass}
                                strokeWidth="0.3"
                            />
                            <text
                                x={pos.x}
                                y={pos.y + 4.5}
                                textAnchor="middle"
                                className={cn(
                                    "text-[2.5px] select-none",
                                    isHighlighted
                                        ? "fill-primary font-bold"
                                        : isOffensive
                                            ? "fill-muted-foreground/60"
                                            : "fill-muted-foreground",
                                )}
                            >
                                {userId ? `${getUserName(userId)} (${short})` : short}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ── Collapsible Diamond Toggle ───────────────────────────────────

export function CollapsibleDiamond({
    show,
    onToggle,
    diamondProps,
}: {
    show: boolean;
    onToggle: () => void;
    diamondProps: React.ComponentProps<typeof FieldingDiamond>;
}) {
    return (
        <>
            <button
                onClick={onToggle}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
                {show ? "Hide" : "Show"} diamond
            </button>
            <div className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-in-out",
                show ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}>
                <div className="overflow-hidden">
                    <FieldingDiamond {...diamondProps} />
                </div>
            </div>
        </>
    );
}

// ── Shared Table Grid (positions × innings) ─────────────────────

interface FieldingTableProps {
    innings: number[];
    renderCell: (inning: number, position: string) => React.ReactNode;
    /** Use editor-style sticky offsets (-left-6, pl-8) */
    editorLayout?: boolean;
}

export function FieldingTable({ innings, renderCell, editorLayout }: FieldingTableProps) {
    const stickyClass = editorLayout
        ? "sticky -left-6 z-10 bg-background pl-8 pr-2"
        : "sticky left-0 z-10 bg-card pl-3 pr-2";

    return (
        <div className={editorLayout ? "pr-6" : "overflow-x-auto"}>
            <table className="w-max border-collapse text-xs">
                <thead>
                    <tr>
                        <th className={cn(stickyClass, "py-1 text-left font-medium w-20")}>
                            Inning
                        </th>
                        {innings.map((inning) => (
                            <th key={inning} className="px-1 py-1 text-center font-medium min-w-[120px] snap-start">
                                {inning}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {POSITION_GROUPS.map((group) => (
                        <Fragment key={group.label}>
                            <tr>
                                <td
                                    className={cn(stickyClass, "pt-2 pb-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap")}
                                >
                                    {group.label}
                                </td>
                            </tr>
                            {group.positions.map((pos) => (
                                <tr key={pos.key}>
                                    <td className={cn(stickyClass, "py-0.5 whitespace-nowrap font-medium")}>
                                        {pos.label}
                                    </td>
                                    {innings.map((inning) => renderCell(inning, pos.key))}
                                </tr>
                            ))}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
