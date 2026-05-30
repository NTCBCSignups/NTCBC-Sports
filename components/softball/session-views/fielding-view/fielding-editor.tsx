"use client";

/**
 * Fielding Editor — the single file that interfaces with edit-views-dialog.
 *
 * Exposes getCurrentData() via useImperativeHandle so the dialog can pull
 * the editor's current state on demand (save, dirty-check, etc.) without
 * relying on onChange callbacks or unmount timing.
 */

import { memo, useEffect, useImperativeHandle, useRef, useState, useSyncExternalStore } from "react";
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
    const [inputValue, setInputValue] = useState("");
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(0);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

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
            const taken = matrix.getTaken(inning, position);
            return Array.from(taken).sort().join(",");
        },
    );

    const taken = unique ? new Set(takenSnapshot ? takenSnapshot.split(",") : []) : null;

    const selectedName = cellValue
        ? displayName(confirmed.find((s) => s.user_id === cellValue)?.profiles ?? null)
        : "";

    // Build filtered options
    const query = inputValue.toLowerCase();
    const options = [
        { id: null, name: "Unassigned", taken: false },
        ...confirmed.map((s) => ({
            id: s.user_id,
            name: displayName(s.profiles),
            taken: taken?.has(s.user_id) ?? false,
        })),
    ].filter((o) => !query || o.name.toLowerCase().includes(query));

    // Reset highlight when options change
    useEffect(() => { setHighlightIndex(0); }, [options.length]);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
                setInputValue("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [open]);

    const selectOption = (id: string | null) => {
        matrix.assign(inning, position, id);
        setOpen(false);
        setInputValue("");
        inputRef.current?.blur();
    };

    return (
        <td className="px-1 py-0.5">
            <div ref={wrapperRef} className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    className={cn(
                        "h-7 text-xs w-[120px] rounded-md border border-input bg-background px-2 py-1 outline-none focus:ring-1 focus:ring-ring truncate",
                        !cellValue && !open && "text-destructive/70",
                    )}
                    placeholder="Unassigned"
                    value={open ? inputValue : selectedName}
                    onChange={(e) => {
                        setInputValue(e.target.value);
                        setHighlightIndex(0);
                        if (!open) setOpen(true);
                    }}
                    onFocus={(e) => {
                        setInputValue(selectedName);
                        setOpen(true);
                        // Select all text so typing replaces it, but copy still works
                        requestAnimationFrame(() => e.target.select());
                    }}
                    onKeyDown={(e) => {
                        if (!open) return;
                        if (e.key === "ArrowDown") {
                            e.preventDefault();
                            setHighlightIndex((i) => Math.min(i + 1, options.length - 1));
                        } else if (e.key === "ArrowUp") {
                            e.preventDefault();
                            setHighlightIndex((i) => Math.max(i - 1, 0));
                        } else if (e.key === "Enter") {
                            e.preventDefault();
                            if (options[highlightIndex]) selectOption(options[highlightIndex].id);
                        } else if (e.key === "Escape") {
                            setOpen(false);
                            setInputValue("");
                            inputRef.current?.blur();
                        } else if (e.key === "Tab") {
                            // Autocomplete top match on Tab
                            if (options.length > 0) {
                                e.preventDefault();
                                selectOption(options[highlightIndex]?.id ?? options[0].id);
                            }
                        }
                    }}
                />
                {open && options.length > 0 && (
                    <ul className="absolute z-50 mt-1 max-h-[180px] w-[180px] overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                        {options.map((o, i) => (
                            <li
                                key={o.id ?? "__unassigned__"}
                                className={cn(
                                    "cursor-pointer px-2 py-1 text-xs",
                                    i === highlightIndex && "bg-accent text-accent-foreground",
                                    o.taken && "opacity-50",
                                )}
                                onMouseEnter={() => setHighlightIndex(i)}
                                onMouseDown={(e) => {
                                    e.preventDefault(); // prevent blur before select
                                    selectOption(o.id);
                                }}
                            >
                                {o.name}{o.taken && " (assigned)"}
                            </li>
                        ))}
                    </ul>
                )}
            </div>
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
