"use client";

import { Fragment, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/format";
import type { SessionViewProps, SessionViewEditorProps } from "./interfaces";

// ── Position definitions ─────────────────────────────────────────

const POSITIONS = {
    batting: [
        { key: "1B_COACH", label: "1st Base Coach" },
        { key: "3B_COACH", label: "3rd Base Coach" },
    ],
    infield: [
        { key: "CATCHER", label: "Catcher" },
        { key: "FIRST_BASE", label: "1st Base" },
        { key: "SECOND_BASE", label: "2nd Base" },
        { key: "CUTOFF", label: "Cutoff" },
        { key: "THIRD_BASE", label: "3rd Base" },
    ],
    outfield: [
        { key: "LEFT_FIELD", label: "Left Field" },
        { key: "LEFT_ROVER", label: "Left Rover" },
        { key: "CENTRE_FIELD", label: "Centre Field" },
        { key: "RIGHT_ROVER", label: "Right Rover" },
        { key: "RIGHT_FIELD", label: "Right Field" },
    ],
} as const;

const ALL_POSITIONS = [
    ...POSITIONS.batting,
    ...POSITIONS.infield,
    ...POSITIONS.outfield,
];

type PositionKey = (typeof ALL_POSITIONS)[number]["key"];

const POSITION_GROUPS = [
    { label: "Batting", positions: POSITIONS.batting },
    { label: "Infield", positions: POSITIONS.infield },
    { label: "Outfield", positions: POSITIONS.outfield },
] as const;

// ── Data types ───────────────────────────────────────────────────

interface FieldingData {
    innings: number;
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
        return viewData as FieldingData;
    }
    return { innings: DEFAULT_INNINGS, assignments: {} };
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

function isInherited(data: FieldingData, inning: number, position: string): boolean {
    return data.assignments[inning]?.[position] === undefined && inning > 1;
}

// ── Diamond SVG ──────────────────────────────────────────────────

const DIAMOND_POSITIONS: Record<string, { x: number; y: number }> = {
    CATCHER: { x: 50, y: 90 },
    FIRST_BASE: { x: 72, y: 58 },
    SECOND_BASE: { x: 50, y: 42 },
    CUTOFF: { x: 50, y: 55 },
    THIRD_BASE: { x: 28, y: 58 },
    LEFT_FIELD: { x: 15, y: 25 },
    LEFT_ROVER: { x: 30, y: 35 },
    CENTRE_FIELD: { x: 50, y: 15 },
    RIGHT_ROVER: { x: 70, y: 35 },
    RIGHT_FIELD: { x: 85, y: 25 },
    "1B_COACH": { x: 82, y: 70 },
    "3B_COACH": { x: 18, y: 70 },
};

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
            <svg viewBox="0 0 100 100" className="w-full h-auto">
                {/* Outfield arc */}
                <path
                    d="M 10 30 Q 50 -5 90 30"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.3"
                    className="text-muted-foreground/40"
                />
                {/* Diamond */}
                <polygon
                    points="50,80 75,55 50,30 25,55"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="0.4"
                    className="text-muted-foreground/60"
                />
                {/* Base paths */}
                <line x1="50" y1="80" x2="75" y2="55" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground/40" />
                <line x1="75" y1="55" x2="50" y2="30" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground/40" />
                <line x1="50" y1="30" x2="25" y2="55" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground/40" />
                <line x1="25" y1="55" x2="50" y2="80" stroke="currentColor" strokeWidth="0.3" className="text-muted-foreground/40" />
                {/* Bases */}
                <rect x="48.5" y="78.5" width="3" height="3" className="fill-muted-foreground/60" /> {/* Home */}
                <rect x="73.5" y="53.5" width="3" height="3" transform="rotate(45 75 55)" className="fill-muted-foreground/60" /> {/* 1st */}
                <rect x="48.5" y="28.5" width="3" height="3" transform="rotate(45 50 30)" className="fill-muted-foreground/60" /> {/* 2nd */}
                <rect x="23.5" y="53.5" width="3" height="3" transform="rotate(45 25 55)" className="fill-muted-foreground/60" /> {/* 3rd */}
                {/* Position markers */}
                {Object.entries(DIAMOND_POSITIONS).map(([posKey, pos]) => {
                    const userId = assignments[posKey];
                    const isHighlighted = highlightUserId && userId === highlightUserId;
                    const posLabel = ALL_POSITIONS.find((p) => p.key === posKey)?.label ?? posKey;
                    return (
                        <g key={posKey}>
                            <circle
                                cx={pos.x}
                                cy={pos.y}
                                r={isHighlighted ? 2.5 : 2}
                                className={cn(
                                    isHighlighted
                                        ? "fill-primary stroke-primary"
                                        : userId
                                            ? "fill-muted-foreground/80 stroke-muted-foreground"
                                            : "fill-muted/50 stroke-muted-foreground/40",
                                )}
                                strokeWidth="0.3"
                            />
                            <text
                                x={pos.x}
                                y={pos.y + 4.5}
                                textAnchor="middle"
                                className={cn(
                                    "text-[2.5px] select-none",
                                    isHighlighted ? "fill-primary font-bold" : "fill-muted-foreground",
                                )}
                            >
                                {userId ? getUserName(userId) : posLabel}
                            </text>
                        </g>
                    );
                })}
            </svg>
        </div>
    );
}

// ── Viewer Component ─────────────────────────────────────────────

export default function FieldingView({
    signups,
    currentUserId,
    viewData,
}: SessionViewProps) {
    const data = parseData(viewData);
    const confirmed = signups.filter((s) => s.status === "confirmed");
    const [mode, setMode] = useState<"player" | "inning">("player");
    const [selectedUser, setSelectedUser] = useState(currentUserId ?? "");
    const [selectedInning, setSelectedInning] = useState(1);

    const userMap = new Map(confirmed.map((s) => [s.user_id, s]));
    const getUserName = (userId: string) =>
        displayName(userMap.get(userId)?.profiles ?? null);

    if (data.innings === 0 || Object.keys(data.assignments).length === 0) {
        return (
            <div className="overflow-hidden rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
                No fielding assignments have been set yet.
            </div>
        );
    }

    const innings = Array.from({ length: data.innings }, (_, i) => i + 1);

    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <div className="border-b p-4">
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
                                {confirmed.map((s) => (
                                    <SelectItem key={s.user_id} value={s.user_id}>
                                        {displayName(s.profiles)}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {selectedUser && (
                            <>
                                <FieldingDiamond
                                    assignments={Object.fromEntries(
                                        ALL_POSITIONS.map((p) => [
                                            p.key,
                                            getEffectiveAssignment(data, selectedInning, p.key),
                                        ]),
                                    )}
                                    highlightUserId={selectedUser}
                                    getUserName={getUserName}
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
                            onValueChange={(v) => setSelectedInning(Number(v))}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {innings.map((i) => (
                                    <SelectItem key={i} value={String(i)}>
                                        Inning {i}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        <FieldingDiamond
                            assignments={Object.fromEntries(
                                ALL_POSITIONS.map((p) => [
                                    p.key,
                                    getEffectiveAssignment(data, selectedInning, p.key),
                                ]),
                            )}
                            highlightUserId={selectedUser || currentUserId}
                            getUserName={getUserName}
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
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

// ── Editor Component ─────────────────────────────────────────────

export function FieldingEditor({
    signups,
    viewData,
    onChange,
}: SessionViewEditorProps) {
    const initial = parseData(viewData);
    const [data, setData] = useState<FieldingData>(initial);
    const confirmed = signups.filter((s) => s.status === "confirmed");

    const update = (next: FieldingData) => {
        setData(next);
        onChange(next);
    };

    const setInnings = (count: number) => {
        const clamped = Math.max(1, Math.min(20, count));
        // Prune assignments beyond new count
        const assignments = { ...data.assignments };
        for (const key of Object.keys(assignments)) {
            if (Number(key) > clamped) delete assignments[Number(key)];
        }
        update({ innings: clamped, assignments });
    };

    const setAssignment = (inning: number, position: string, userId: string | null) => {
        const inningAssignments = { ...(data.assignments[inning] ?? {}) };
        if (userId === null) {
            delete inningAssignments[position];
        } else {
            inningAssignments[position] = userId;
        }
        update({
            ...data,
            assignments: { ...data.assignments, [inning]: inningAssignments },
        });
    };

    const innings = Array.from({ length: data.innings }, (_, i) => i + 1);
    const [activeInning, setActiveInning] = useState(1);

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <Label htmlFor="innings-count" className="text-sm whitespace-nowrap">
                    Innings
                </Label>
                <Input
                    id="innings-count"
                    type="number"
                    min={1}
                    max={20}
                    value={data.innings}
                    onChange={(e) => setInnings(Number(e.target.value))}
                    className="w-20"
                />
            </div>

            <Tabs value={String(activeInning)} onValueChange={(v) => setActiveInning(Number(v))}>
                <TabsList className="flex flex-wrap h-auto gap-1">
                    {innings.map((i) => (
                        <TabsTrigger key={i} value={String(i)} className="px-3 py-1.5 text-xs">
                            {i}
                        </TabsTrigger>
                    ))}
                </TabsList>

                {innings.map((inning) => (
                    <TabsContent key={inning} value={String(inning)} className="mt-4 space-y-4">
                        {POSITION_GROUPS.map((group) => (
                            <div key={group.label} className="space-y-2">
                                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                    {group.label}
                                </h4>
                                <div className="grid gap-2">
                                    {group.positions.map((pos) => {
                                        const effective = getEffectiveAssignment(data, inning, pos.key);
                                        const inherited = isInherited(data, inning, pos.key);
                                        const explicitValue = data.assignments[inning]?.[pos.key];

                                        return (
                                            <div key={pos.key} className="flex items-center gap-2">
                                                <span className="text-sm w-28 shrink-0">{pos.label}</span>
                                                <Select
                                                    value={explicitValue ?? "__inherit__"}
                                                    onValueChange={(v) =>
                                                        setAssignment(
                                                            inning,
                                                            pos.key,
                                                            v === "__inherit__" ? null : v,
                                                        )
                                                    }
                                                >
                                                    <SelectTrigger
                                                        className={cn(
                                                            "flex-1",
                                                            inherited && "text-muted-foreground",
                                                        )}
                                                    >
                                                        <SelectValue
                                                            placeholder={
                                                                inherited && effective
                                                                    ? `${displayName(confirmed.find((s) => s.user_id === effective)?.profiles ?? null)} (default)`
                                                                    : "Unassigned"
                                                            }
                                                        />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="__inherit__">
                                                            {inning > 1 && effective
                                                                ? `${displayName(confirmed.find((s) => s.user_id === effective)?.profiles ?? null)} (default)`
                                                                : "Unassigned"}
                                                        </SelectItem>
                                                        {confirmed.map((s) => (
                                                            <SelectItem key={s.user_id} value={s.user_id}>
                                                                {displayName(s.profiles)}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
