"use client";

import { Fragment, memo, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/format";
import type { SessionViewProps, SessionViewEditorProps } from "@/components/sports/session-views/interfaces";

// ── Position definitions ─────────────────────────────────────────

const POSITIONS = {
    batting: [
        { key: "1B_COACH", label: "1B Coach", short: "1B Coach" },
        { key: "3B_COACH", label: "3B Coach", short: "3B Coach" },
    ],
    infield: [
        { key: "PITCHER", label: "Pitcher", short: "P" },
        { key: "CATCHER", label: "Catcher", short: "C" },
        { key: "FIRST_BASE", label: "1st Base", short: "1B" },
        { key: "SECOND_BASE", label: "2nd Base", short: "2B" },
        { key: "SHORTSTOP", label: "Shortstop", short: "SS" },
        { key: "THIRD_BASE", label: "3rd Base", short: "3B" },
    ],
    outfield: [
        { key: "LEFT_FIELD", label: "Left Field", short: "LF" },
        { key: "LEFT_ROVER", label: "Left Rover", short: "LR" },
        { key: "CENTRE_FIELD", label: "Centre Field", short: "CF" },
        { key: "RIGHT_ROVER", label: "Right Rover", short: "RR" },
        { key: "RIGHT_FIELD", label: "Right Field", short: "RF" },
    ],
} as const;

const ALL_POSITIONS = [
    ...POSITIONS.batting,
    ...POSITIONS.infield,
    ...POSITIONS.outfield,
];

const COACH_KEYS: Set<string> = new Set(POSITIONS.batting.map((p) => p.key));

const POSITION_GROUPS = [
    { label: "Batting", positions: POSITIONS.batting },
    { label: "Infield", positions: POSITIONS.infield },
    { label: "Outfield", positions: POSITIONS.outfield },
] as const;

// ── Data types ───────────────────────────────────────────────────

interface FieldingData {
    innings: number;
    unique: boolean;
    assignments: Record<number, Record<string, string | null>>;
}

const DEFAULT_INNINGS = 7;

function parseData(viewData: unknown): FieldingData {
    if (
        viewData &&
        typeof viewData === "object" &&
        "innings" in viewData &&
        "assignments" in viewData
    ) {
        const d = viewData as FieldingData;
        return { innings: d.innings, unique: d.unique ?? true, assignments: d.assignments };
    }
    return { innings: DEFAULT_INNINGS, unique: true, assignments: {} };
}

function getEffectiveAssignment(
    data: FieldingData,
    inning: number,
    position: string,
): string | null {
    // Check current inning first
    const current = data.assignments[inning]?.[position];
    if (current !== undefined) return current;
    // Inherit from previous inning
    if (inning > 1) return getEffectiveAssignment(data, inning - 1, position);
    return null;
}

// ── Fielding Matrix (external store for cell-level subscriptions) ──

type CellKey = `${number}:${string}`;
type Listener = () => void;

class FieldingMatrix {
    private data: Record<number, Record<string, string>>;
    private unique: boolean;
    private listeners = new Map<CellKey, Set<Listener>>();
    // Per-inning listeners for "taken" changes (any assignment change in that inning)
    private inningListeners = new Map<number, Set<Listener>>();
    private globalListeners = new Set<Listener>();

    constructor(assignments: FieldingData["assignments"], unique: boolean) {
        // Deep-copy, filtering nulls
        this.data = {};
        for (const [inning, positions] of Object.entries(assignments)) {
            const i = Number(inning);
            this.data[i] = {};
            for (const [pos, userId] of Object.entries(positions)) {
                if (userId) this.data[i][pos] = userId;
            }
        }
        this.unique = unique;
    }

    setUnique(unique: boolean) {
        this.unique = unique;
    }

    getCell(inning: number, position: string): string | null {
        return this.data[inning]?.[position] ?? null;
    }

    assign(inning: number, position: string, userId: string | null): void {
        if (!this.data[inning]) this.data[inning] = {};

        let unsetPosition: string | null = null;

        // Unique: unassign user from other position in same inning
        if (userId && this.unique) {
            for (const [pos, assignedId] of Object.entries(this.data[inning])) {
                if (pos !== position && assignedId === userId) {
                    delete this.data[inning][pos];
                    unsetPosition = pos;
                    break;
                }
            }
        }

        if (userId === null) {
            delete this.data[inning][position];
        } else {
            this.data[inning][position] = userId;
        }

        // Notify affected cells
        this.notify(inning, position);
        if (unsetPosition) this.notify(inning, unsetPosition);
        // Notify inning listeners (taken set changed)
        this.notifyInning(inning);
    }

    /** Get user IDs assigned to other positions in this inning. */
    getTaken(inning: number, excludePosition: string): Set<string> {
        const taken = new Set<string>();
        const inningData = this.data[inning];
        if (!inningData) return taken;
        for (const [pos, userId] of Object.entries(inningData)) {
            if (pos !== excludePosition && userId) taken.add(userId);
        }
        return taken;
    }

    /** Export final data for saving (omits empty innings). */
    export(): FieldingData["assignments"] {
        const result: Record<number, Record<string, string>> = {};
        for (const [inning, positions] of Object.entries(this.data)) {
            if (Object.keys(positions).length > 0) {
                result[Number(inning)] = { ...positions };
            }
        }
        return result;
    }

    removeInningsAbove(max: number) {
        for (const key of Object.keys(this.data)) {
            if (Number(key) > max) delete this.data[Number(key)];
        }
    }

    /** For each position, fill unassigned innings after the last assigned inning with that last value. */
    assignAll(totalInnings: number, positions: readonly { key: string }[]) {
        for (const pos of positions) {
            // Find the last inning with an explicit assignment for this position
            let lastAssignedInning = 0;
            let lastValue: string | null = null;
            for (let i = totalInnings; i >= 1; i--) {
                const val = this.data[i]?.[pos.key];
                if (val) {
                    lastAssignedInning = i;
                    lastValue = val;
                    break;
                }
            }
            if (!lastValue || lastAssignedInning >= totalInnings) continue;
            // Fill all unassigned innings after the last assigned one
            for (let i = lastAssignedInning + 1; i <= totalInnings; i++) {
                if (!this.data[i]?.[pos.key]) {
                    if (!this.data[i]) this.data[i] = {};
                    this.data[i][pos.key] = lastValue;
                    this.notify(i, pos.key);
                    this.notifyInning(i);
                }
            }
        }
    }

    /** Clear all assignments across all innings/positions. */
    unassignAll(totalInnings: number, positions: readonly { key: string }[]) {
        for (const pos of positions) {
            for (let i = 1; i <= totalInnings; i++) {
                if (this.data[i]?.[pos.key]) {
                    delete this.data[i][pos.key];
                    this.notify(i, pos.key);
                    this.notifyInning(i);
                }
            }
        }
    }

    /** Returns true if assignAll would change anything. */
    hasAssignable(totalInnings: number, positions: readonly { key: string }[]): boolean {
        for (const pos of positions) {
            let lastAssignedInning = 0;
            for (let i = totalInnings; i >= 1; i--) {
                if (this.data[i]?.[pos.key]) { lastAssignedInning = i; break; }
            }
            if (lastAssignedInning === 0 || lastAssignedInning >= totalInnings) continue;
            for (let i = lastAssignedInning + 1; i <= totalInnings; i++) {
                if (!this.data[i]?.[pos.key]) return true;
            }
        }
        return false;
    }

    // ── Subscriptions ──

    subscribeCell(inning: number, position: string, listener: Listener): () => void {
        const key: CellKey = `${inning}:${position}`;
        if (!this.listeners.has(key)) this.listeners.set(key, new Set());
        this.listeners.get(key)!.add(listener);
        return () => this.listeners.get(key)?.delete(listener);
    }

    subscribeInning(inning: number, listener: Listener): () => void {
        if (!this.inningListeners.has(inning)) this.inningListeners.set(inning, new Set());
        this.inningListeners.get(inning)!.add(listener);
        return () => this.inningListeners.get(inning)?.delete(listener);
    }

    subscribeGlobal(listener: Listener): () => void {
        this.globalListeners.add(listener);
        return () => this.globalListeners.delete(listener);
    }

    private notify(inning: number, position: string) {
        const key: CellKey = `${inning}:${position}`;
        this.listeners.get(key)?.forEach((l) => l());
        this.globalListeners.forEach((l) => l());
    }

    private notifyInning(inning: number) {
        this.inningListeners.get(inning)?.forEach((l) => l());
    }
}

// ── FieldingCell (only re-renders when its own value or inning taken set changes) ──

interface FieldingCellProps {
    matrix: FieldingMatrix;
    inning: number;
    position: string;
    unique: boolean;
    confirmed: { user_id: string; profiles: { full_name: string | null; email: string | null } | null }[];
}

const FieldingCell = memo(function FieldingCell({ matrix, inning, position, unique, confirmed }: FieldingCellProps) {
    // Subscribe to this cell's value
    const cellValue = useSyncExternalStore(
        (cb) => matrix.subscribeCell(inning, position, cb),
        () => matrix.getCell(inning, position),
    );

    // Subscribe to inning-level changes (for "taken" indicators)
    const takenSnapshot = useSyncExternalStore(
        (cb) => matrix.subscribeInning(inning, cb),
        () => {
            if (!unique) return "";
            // Serialize taken set for stable snapshot comparison
            const taken = matrix.getTaken(inning, position);
            return Array.from(taken).sort().join(",");
        },
    );

    const taken = unique ? new Set(takenSnapshot ? takenSnapshot.split(",") : []) : null;

    return (
        <td className="px-1 py-0.5">
            <Select
                value={cellValue ?? "__unassigned__"}
                onValueChange={(v) =>
                    matrix.assign(inning, position, v === "__unassigned__" ? null : v)
                }
            >
                <SelectTrigger className={cn("h-7 text-xs w-[120px]", !cellValue && "text-destructive/70")}>
                    <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="__unassigned__">Unassigned</SelectItem>
                    {confirmed.map((s) => {
                        const isTaken = taken?.has(s.user_id) ?? false;
                        return (
                            <SelectItem
                                key={s.user_id}
                                value={s.user_id}
                                className={isTaken ? "opacity-50" : ""}
                            >
                                {displayName(s.profiles)}
                                {isTaken && " (assigned)"}
                            </SelectItem>
                        );
                    })}
                </SelectContent>
            </Select>
        </td>
    );
});

// ── Diamond SVG ──────────────────────────────────────────────────

const DIAMOND_POSITIONS: Record<string, { x: number; y: number }> = {
    CENTRE_FIELD: { x: 50, y: 5 },
    LEFT_FIELD: { x: 6, y: 18 },
    RIGHT_FIELD: { x: 94, y: 18 },
    LEFT_ROVER: { x: 24, y: 24 },
    RIGHT_ROVER: { x: 76, y: 24 },
    SHORTSTOP: { x: 36, y: 48 },
    SECOND_BASE: { x: 64, y: 48 },
    THIRD_BASE: { x: 22, y: 64 },
    FIRST_BASE: { x: 78, y: 64 },
    PITCHER: { x: 50, y: 68 },
    CATCHER: { x: 50, y: 94 },
    "1B_COACH": { x: 84, y: 82 },
    "3B_COACH": { x: 16, y: 82 },
};

const INFIELD_KEYS: Set<string> = new Set(POSITIONS.infield.map((p) => p.key));
const OUTFIELD_KEYS: Set<string> = new Set(POSITIONS.outfield.map((p) => p.key));

function FieldingDiamond({
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
                    const isCoach = COACH_KEYS.has(posKey);
                    const isOutfield = OUTFIELD_KEYS.has(posKey);
                    const isInfield = INFIELD_KEYS.has(posKey);

                    const circleClass = isHighlighted
                        ? "fill-primary stroke-primary"
                        : isCoach
                            ? "fill-red-400/60 stroke-red-500/70"
                            : userId
                                ? isOutfield
                                    ? "fill-emerald-400/70 stroke-emerald-500/80"
                                    : isInfield
                                        ? "fill-amber-400/70 stroke-amber-500/80"
                                        : "fill-muted-foreground/80 stroke-muted-foreground"
                                : isOutfield
                                    ? "fill-emerald-400/20 stroke-emerald-500/30"
                                    : isInfield
                                        ? "fill-amber-400/20 stroke-amber-500/30"
                                        : "fill-muted/50 stroke-muted-foreground/40";

                    return (
                        <g key={posKey} className={isCoach ? "opacity-50" : ""}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isHighlighted ? 2.5 : 2}
                                className={circleClass}
                                strokeWidth="0.3"
                                strokeDasharray={isCoach ? "1 0.5" : undefined}
                            />
                            <text
                                x={pos.x}
                                y={pos.y + 4.5}
                                textAnchor="middle"
                                className={cn(
                                    "text-[2.5px] select-none",
                                    isHighlighted
                                        ? "fill-primary font-bold"
                                        : isCoach
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

function CollapsibleDiamond({
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

// ── Viewer Component ─────────────────────────────────────────────

export default function SoftballFieldingView({
    signups,
    currentUserId,
    viewData,
}: SessionViewProps) {
    const data = parseData(viewData);
    const confirmed = signups.filter((s) => s.status === "confirmed");
    const [mode, setMode] = useState<"player" | "inning">("player");
    const [selectedUser, setSelectedUser] = useState(currentUserId ?? "");
    const [selectedInning, setSelectedInning] = useState<number | "all">(1);
    const [showDiamond, setShowDiamond] = useState(true);

    const sorted = [...confirmed].sort((a, b) => {
        if (a.user_id === currentUserId) return -1;
        if (b.user_id === currentUserId) return 1;
        return displayName(a.profiles).localeCompare(displayName(b.profiles));
    });
    const userMap = new Map(confirmed.map((s) => [s.user_id, s]));
    const getUserName = (userId: string) =>
        displayName(userMap.get(userId)?.profiles ?? null);

    if (Object.keys(data.assignments).length === 0) {
        return (
            <div className="overflow-hidden rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                No fielding assignments have been set yet.
            </div>
        );
    }

    // Use the greater of data.innings and the highest assignment key to handle
    // cases where the saved innings count is inconsistent with actual data
    const maxAssignmentInning = Math.max(...Object.keys(data.assignments).map(Number));
    const effectiveInnings = Math.max(data.innings, maxAssignmentInning);
    const innings = Array.from({ length: effectiveInnings }, (_, i) => i + 1);

    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <div className="p-4">
                <Tabs value={mode} onValueChange={(v) => setMode(v as "player" | "inning")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="player">By Player</TabsTrigger>
                        <TabsTrigger value="inning">By Inning</TabsTrigger>
                    </TabsList>

                    <TabsContent value="player" className="mt-4 space-y-4">
                        <Select value={selectedUser} onValueChange={setSelectedUser}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a player" />
                            </SelectTrigger>
                            <SelectContent>
                                {sorted.map((s) => (
                                    <SelectItem key={s.user_id} value={s.user_id}>
                                        {displayName(s.profiles)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedUser && (
                            <>
                                <CollapsibleDiamond
                                    show={showDiamond}
                                    onToggle={() => setShowDiamond(!showDiamond)}
                                    diamondProps={{
                                        assignments: Object.fromEntries(
                                            ALL_POSITIONS.map((p) => [
                                                p.key,
                                                getEffectiveAssignment(data, typeof selectedInning === "number" ? selectedInning : 1, p.key),
                                            ]),
                                        ),
                                        highlightUserId: selectedUser,
                                        getUserName,
                                    }}
                                />

                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead className="w-16">Inning</TableHead>
                                            <TableHead>Position</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {innings.map((inning) => {
                                            const position = ALL_POSITIONS.find(
                                                (p) => getEffectiveAssignment(data, inning, p.key) === selectedUser,
                                            );
                                            return (
                                                <TableRow
                                                    key={inning}
                                                    className={cn(
                                                        "cursor-pointer",
                                                        selectedInning === inning && "bg-status-info",
                                                    )}
                                                    onClick={() => setSelectedInning(inning)}
                                                >
                                                    <TableCell className="font-mono text-xs">
                                                        {inning}
                                                    </TableCell>
                                                    <TableCell>
                                                        {position?.label ?? "—"}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </TabsContent>

                    <TabsContent value="inning" className="mt-4 space-y-4">
                        <Select
                            value={String(selectedInning)}
                            onValueChange={(v) => setSelectedInning(v === "all" ? "all" : Number(v))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Innings</SelectItem>
                                {innings.map((i) => (
                                    <SelectItem key={i} value={String(i)}>
                                        Inning {i}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedInning === "all" ? (
                            <FieldingTable
                                innings={innings}
                                renderCell={(inning, position) => {
                                    const userId = data.assignments[inning]?.[position] ?? null;
                                    const isCurrentUser = userId === (currentUserId ?? "");
                                    return (
                                        <td
                                            key={inning}
                                            className={cn(
                                                "px-1 py-0.5 text-center min-w-[120px]",
                                                isCurrentUser && "bg-status-info",
                                            )}
                                        >
                                            {userId ? getUserName(userId) : "—"}
                                        </td>
                                    );
                                }}
                            />
                        ) : (
                            <>
                                <CollapsibleDiamond
                                    show={showDiamond}
                                    onToggle={() => setShowDiamond(!showDiamond)}
                                    diamondProps={{
                                        assignments: Object.fromEntries(
                                            ALL_POSITIONS.map((p) => [
                                                p.key,
                                                getEffectiveAssignment(data, selectedInning, p.key),
                                            ]),
                                        ),
                                        highlightUserId: selectedUser || currentUserId,
                                        getUserName,
                                    }}
                                />

                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/50">
                                            <TableHead>Position</TableHead>
                                            <TableHead>Player</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {POSITION_GROUPS.map((group) => (
                                            <Fragment key={group.label}>
                                                <TableRow className="bg-muted/30">
                                                    <TableCell colSpan={2} className="text-xs font-semibold uppercase tracking-wide text-muted-foreground py-1.5">
                                                        {group.label}
                                                    </TableCell>
                                                </TableRow>
                                                {group.positions.map((pos) => {
                                                    const userId = getEffectiveAssignment(data, selectedInning, pos.key);
                                                    const isCurrentUser = userId === (currentUserId ?? "");
                                                    return (
                                                        <TableRow
                                                            key={pos.key}
                                                            className={isCurrentUser ? "bg-status-info" : ""}
                                                        >
                                                            <TableCell className="text-sm">{pos.label}</TableCell>
                                                            <TableCell className="text-sm">
                                                                {userId ? getUserName(userId) : "—"}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </Fragment>
                                        ))}
                                    </TableBody>
                                </Table>
                            </>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ── Shared Table Grid (positions × innings) ─────────────────────

interface FieldingTableProps {
    innings: number[];
    renderCell: (inning: number, position: string) => React.ReactNode;
    /** Use editor-style sticky offsets (-left-6, pl-8) */
    editorLayout?: boolean;
}

function FieldingTable({ innings, renderCell, editorLayout }: FieldingTableProps) {
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

// ── Editor Component ─────────────────────────────────────────────

export function SoftballFieldingEditor({
    signups,
    viewData,
    onChange,
}: SessionViewEditorProps) {
    const initial = parseData(viewData);
    const [innings, setInningsState] = useState(initial.innings);
    const [inningsInput, setInningsInput] = useState(initial.innings);
    const [unique, setUnique] = useState(initial.unique);
    const [matrix] = useState(() => new FieldingMatrix(initial.assignments, initial.unique));
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const inningsRef = useRef(initial.innings);
    const uniqueRef = useRef(initial.unique);
    const confirmed = signups
        .filter((s) => s.status === "confirmed")
        .sort((a, b) => displayName(a.profiles).localeCompare(displayName(b.profiles)));

    // Sync data to parent on unmount (when Back is clicked or dialog closes)
    useEffect(() => {
        return () => {
            onChangeRef.current({
                innings: inningsRef.current,
                unique: uniqueRef.current,
                assignments: matrix.export(),
            });
        };
    }, [matrix]);

    const setInnings = (count: number) => {
        const clamped = Math.max(1, Math.min(20, count));
        setInningsInput(clamped);
        inningsRef.current = clamped;
        matrix.removeInningsAbove(clamped);
        setInningsState(clamped);
    };

    const inningsArray = Array.from({ length: innings }, (_, i) => i + 1);

    const canAssignAll = useSyncExternalStore(
        (cb) => matrix.subscribeGlobal(cb),
        () => matrix.hasAssignable(innings, ALL_POSITIONS),
    );

    return (
        <div className="space-y-3 -mx-6">
            <div className="flex items-center justify-between gap-4 sticky -left-6 z-10 bg-background pl-8 pr-8 w-fit">
                <div className="flex items-center gap-3">
                    <Label htmlFor="innings-count" className="text-sm whitespace-nowrap">
                        Innings
                    </Label>
                    <Input
                        id="innings-count"
                        type="number"
                        min={1}
                        max={20}
                        value={inningsInput}
                        onChange={(e) => setInnings(Number(e.target.value))}
                        className="w-20"
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Label htmlFor="unique-toggle" className="text-sm whitespace-nowrap">
                        Unique
                    </Label>
                    <Switch
                        id="unique-toggle"
                        checked={unique}
                        onCheckedChange={(checked) => {
                            setUnique(checked);
                            uniqueRef.current = checked;
                            matrix.setUnique(checked);
                        }}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2 sticky -left-6 z-10 bg-background pl-8 pr-8 w-fit">
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    disabled={!canAssignAll}
                    onClick={() => matrix.assignAll(innings, ALL_POSITIONS)}
                >
                    Assign All
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => matrix.unassignAll(innings, ALL_POSITIONS)}
                >
                    Unassign All
                </Button>
            </div>

            {/* Horizontally scrollable table: positions as rows, innings as columns */}
            <FieldingTable
                innings={inningsArray}
                editorLayout
                renderCell={(inning, position) => (
                    <FieldingCell
                        key={`${inning}:${position}`}
                        matrix={matrix}
                        inning={inning}
                        position={position}
                        unique={unique}
                        confirmed={confirmed}
                    />
                )}
            />
        </div>
    );
}
