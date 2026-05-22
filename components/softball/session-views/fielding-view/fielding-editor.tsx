"use client";

/**
 * Fielding Editor — the single file that interfaces with edit-views-dialog.
 *
 * Exposes getCurrentData() via useImperativeHandle so the dialog can pull
 * the editor's current state on demand (save, dirty-check, etc.) without
 * relying on onChange callbacks or unmount timing.
 */

import { memo, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/format";
import type { SessionViewEditorProps } from "@/components/sports/session-views/interfaces";
import { ALL_POSITIONS, FieldingMatrix, parseData } from "./fielding-data";
import { FieldingTable } from "./fielding-shared";

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

// ── Editor Component ─────────────────────────────────────────────

export function SoftballFieldingEditor({
    signups,
    viewData,
    ref,
}: SessionViewEditorProps) {
    const initial = parseData(viewData);
    const [innings, setInningsState] = useState(initial.innings);
    const [inningsInput, setInningsInput] = useState(initial.innings);
    const [unique, setUnique] = useState(initial.unique);
    const [matrix] = useState(() => new FieldingMatrix(initial.assignments, initial.unique));
    const inningsRef = useRef(initial.innings);
    const uniqueRef = useRef(initial.unique);
    const confirmed = signups
        .filter((s) => s.status === "confirmed")
        .sort((a, b) => displayName(a.profiles).localeCompare(displayName(b.profiles)));

    // Expose getCurrentData so the dialog can pull data imperatively on save
    useImperativeHandle(ref, () => ({
        getCurrentData: () => ({
            innings: inningsRef.current,
            unique: uniqueRef.current,
            assignments: matrix.export(),
        }),
    }), [matrix]);

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
