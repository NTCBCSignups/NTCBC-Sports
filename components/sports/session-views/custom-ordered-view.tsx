"use client";

import { useImperativeHandle, useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { EyeOff, Plus, Trash2 } from "lucide-react";
import { DraggableList } from "@/components/ui/draggable-list";
import { TeamMemberBadge } from "@/components/sports/badges";
import SignupSummaryHeader from "@/components/sports/signup-summary-header";
import { displayName } from "@/lib/format";
import type { SessionViewProps, SessionViewEditorProps } from "./interfaces";
import type { SignupRow } from "@/components/sports/session-signups-table";

const SPACER_PREFIX = "__SPACER_";
const isSpacer = (entry: string) => entry.startsWith(SPACER_PREFIX);
const createSpacerEntry = (label = "") =>
    `${SPACER_PREFIX}${Date.now()}_${Math.random().toString(36).slice(2, 6)}__${label}`;
const getSpacerLabel = (entry: string) => {
    const suffixIdx = entry.indexOf("__", SPACER_PREFIX.length);
    return suffixIdx === -1 ? "" : entry.slice(suffixIdx + 2);
};
const setSpacerLabel = (entry: string, label: string) => {
    const suffixIdx = entry.indexOf("__", SPACER_PREFIX.length);
    return (suffixIdx === -1 ? entry : entry.slice(0, suffixIdx + 2)) + label;
};

/**
 * Generic ordered signups view.
 * Expects viewData to be a string[] of user IDs representing the order.
 * Confirmed players not in the order are appended at the end.
 */
export default function CustomOrderedView({
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
    viewData,
}: SessionViewProps) {
    const order = Array.isArray(viewData) ? (viewData as string[]) : [];
    const allSignups = signups.filter((s) => s.status !== "cancelled");
    const confirmed = allSignups.filter((s) => s.status === "confirmed");
    const waitlisted = allSignups.filter((s) => s.status === "waitlisted");

    // Only show players before the __HIDDEN__ divider
    const dividerIdx = order.indexOf("__HIDDEN__");
    const visibleOrder = dividerIdx === -1 ? order : order.slice(0, dividerIdx);

    // Build ordered list with spacers interleaved
    const orderedEntries: OrderEntry[] = [];
    const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));

    for (const entry of visibleOrder) {
        if (isSpacer(entry)) {
            orderedEntries.push({ type: "spacer", id: entry, label: getSpacerLabel(entry) });
        } else {
            const signup = confirmedMap.get(entry);
            if (signup) {
                orderedEntries.push({ type: "player", signup });
                confirmedMap.delete(entry);
            }
        }
    }
    // Append any confirmed players not in the saved order (only if no divider set)
    if (dividerIdx === -1) {
        for (const signup of confirmedMap.values()) {
            orderedEntries.push({ type: "player", signup });
        }
    }

    const hasOrder = order.length > 0;

    return (
        <div className="overflow-hidden rounded-lg border bg-card">
            <SignupSummaryHeader
                confirmedCount={confirmed.length}
                waitlistedCount={waitlisted.length}
                playerCap={playerCap}
            />

            {confirmed.length === 0 ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                    No confirmed sign-ups yet.
                </div>
            ) : !hasOrder ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                    No order has been set yet. An admin can configure this view.
                </div>
            ) : (
                <OrderedContent
                    orderedEntries={orderedEntries}
                    currentUserId={currentUserId}
                    teamMemberIds={teamMemberIds}
                />
            )}
        </div>
    );
}

// ── Helpers for multi-column layout ─────────────────────────────

type OrderEntry = { type: "player"; signup: SignupRow } | { type: "spacer"; id: string; label: string };
type Group = { label: string; entries: Extract<OrderEntry, { type: "player" }>[] };

/** Split entries into groups separated by spacers. */
function splitBySpacers(entries: OrderEntry[]): Group[] {
    const groups: Group[] = [{ label: "", entries: [] }];
    for (const entry of entries) {
        if (entry.type === "spacer") {
            groups.push({ label: entry.label, entries: [] });
        } else {
            groups[groups.length - 1].entries.push(entry);
        }
    }
    return groups;
}

function ColumnTable({
    group,
    startIndex,
    currentUserId,
    teamMemberIds,
}: {
    group: Group;
    startIndex: number;
    currentUserId?: string | null;
    teamMemberIds: Set<string>;
}) {
    return (
        <div className="flex-1 min-w-0">
            {group.label && (
                <div className="flex items-center gap-2 px-4 py-1">
                    <div className="flex-1 border-t border-dashed border-border" />
                    <span className="text-xs text-muted-foreground px-1">{group.label}</span>
                    <div className="flex-1 border-t border-dashed border-border" />
                </div>
            )}
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead className="w-8">#</TableHead>
                        <TableHead className="w-6 px-0"></TableHead>
                        <TableHead>Name</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="[&_tr:last-child]:border-b">
                    {group.entries.map((entry, i) => {
                        const { signup } = entry;
                        const isCurrentUser = currentUserId === signup.user_id;
                        return (
                            <TableRow
                                key={signup.id}
                                className={isCurrentUser ? "bg-status-info" : ""}
                            >
                                <TableCell className="font-mono text-xs">
                                    {startIndex + i + 1}
                                </TableCell>
                                <TableCell className="px-0 align-middle">
                                    {teamMemberIds.has(signup.user_id) && <TeamMemberBadge />}
                                </TableCell>
                                <TableCell>
                                    {displayName(signup.profiles)}
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function SingleColumnTable({
    entries,
    currentUserId,
    teamMemberIds,
}: {
    entries: OrderEntry[];
    currentUserId?: string | null;
    teamMemberIds: Set<string>;
}) {
    let playerIndex = 0;
    return (
        <Table>
            <TableHeader>
                <TableRow className="bg-muted/50">
                    <TableHead className="w-8">#</TableHead>
                    <TableHead className="w-6 px-0"></TableHead>
                    <TableHead>Name</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {entries.map((entry) => {
                    if (entry.type === "spacer") {
                        return (
                            <TableRow key={entry.id} className="pointer-events-none">
                                <TableCell colSpan={3} className="py-1 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 border-t border-dashed border-border" />
                                        {entry.label && (
                                            <span className="text-xs text-muted-foreground px-1">{entry.label}</span>
                                        )}
                                        <div className="flex-1 border-t border-dashed border-border" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        );
                    }
                    playerIndex++;
                    const { signup } = entry;
                    const isCurrentUser = currentUserId === signup.user_id;
                    return (
                        <TableRow
                            key={signup.id}
                            className={isCurrentUser ? "bg-status-info" : ""}
                        >
                            <TableCell className="font-mono text-xs">
                                {playerIndex}
                            </TableCell>
                            <TableCell className="px-0 align-middle">
                                {teamMemberIds.has(signup.user_id) && <TeamMemberBadge />}
                            </TableCell>
                            <TableCell>
                                {displayName(signup.profiles)}
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
}

function OrderedContent({
    orderedEntries,
    currentUserId,
    teamMemberIds,
}: {
    orderedEntries: OrderEntry[];
    currentUserId?: string | null;
    teamMemberIds: Set<string>;
}) {
    const groups = splitBySpacers(orderedEntries);
    // Filter to only groups that have players
    const nonEmptyGroups = groups.filter((g) => g.entries.length > 0);

    // If only 1 group (no spacers or all in one group), split players in half for 2 columns
    if (nonEmptyGroups.length === 1 && nonEmptyGroups[0].entries.length > 1) {
        const entries = nonEmptyGroups[0].entries;
        const mid = Math.ceil(entries.length / 2);
        const leftGroup: Group = { label: nonEmptyGroups[0].label, entries: entries.slice(0, mid) };
        const rightGroup: Group = { label: "", entries: entries.slice(mid) };

        return (
            <>
                <div className="hidden sm:flex">
                    <ColumnTable
                        group={leftGroup}
                        startIndex={0}
                        currentUserId={currentUserId}
                        teamMemberIds={teamMemberIds}
                    />
                    <div className="w-px bg-border" />
                    <ColumnTable
                        group={rightGroup}
                        startIndex={mid}
                        currentUserId={currentUserId}
                        teamMemberIds={teamMemberIds}
                    />
                </div>
                <div className="sm:hidden">
                    <SingleColumnTable
                        entries={orderedEntries}
                        currentUserId={currentUserId}
                        teamMemberIds={teamMemberIds}
                    />
                </div>
            </>
        );
    }

    // 2+ non-empty groups → show side-by-side columns on desktop
    if (nonEmptyGroups.length >= 2) {
        const mid = Math.ceil(nonEmptyGroups.length / 2);
        const leftGroups = nonEmptyGroups.slice(0, mid);
        const rightGroups = nonEmptyGroups.slice(mid);
        const leftEntries = leftGroups.flatMap((g) => g.entries);

        return (
            <>
                <div className="hidden sm:flex">
                    <div className="flex-1 min-w-0">
                        {leftGroups.map((group, gi) => (
                            <ColumnTable
                                key={gi}
                                group={group}
                                startIndex={leftGroups.slice(0, gi).reduce((sum, g) => sum + g.entries.length, 0)}
                                currentUserId={currentUserId}
                                teamMemberIds={teamMemberIds}
                            />
                        ))}
                    </div>
                    <div className="w-px bg-border" />
                    <div className="flex-1 min-w-0">
                        {rightGroups.map((group, gi) => (
                            <ColumnTable
                                key={gi}
                                group={group}
                                startIndex={leftEntries.length + rightGroups.slice(0, gi).reduce((sum, g) => sum + g.entries.length, 0)}
                                currentUserId={currentUserId}
                                teamMemberIds={teamMemberIds}
                            />
                        ))}
                    </div>
                </div>
                <div className="sm:hidden">
                    <SingleColumnTable
                        entries={orderedEntries}
                        currentUserId={currentUserId}
                        teamMemberIds={teamMemberIds}
                    />
                </div>
            </>
        );
    }

    // Fallback: single column
    return (
        <SingleColumnTable
            entries={orderedEntries}
            currentUserId={currentUserId}
            teamMemberIds={teamMemberIds}
        />
    );
}

/**
 * Generic ordered list editor — drag-drop reorderable list of confirmed signups.
 * Supports spacer entries that render as visual dividers.
 * Exposes getCurrentData() via ref for the dialog to pull on save.
 */
export function CustomOrderedEditor({
    signups,
    viewData,
    ref,
}: SessionViewEditorProps) {
    const currentOrder = Array.isArray(viewData) ? (viewData as string[]) : [];
    const confirmed = signups.filter((s) => s.status === "confirmed");

    type EditorItem = { type: "player"; signup: typeof confirmed[0] } | { type: "spacer"; id: string; label: string };

    // Build initial order: saved order first, then any new confirmed players appended
    // The __HIDDEN__ sentinel separates visible from hidden players
    const buildInitialOrder = () => {
        const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));
        const ordered: EditorItem[] = [];
        const hidden: EditorItem[] = [];
        let pastDivider = false;

        for (const entry of currentOrder) {
            if (entry === "__HIDDEN__") {
                pastDivider = true;
                continue;
            }
            if (isSpacer(entry)) {
                const spacerItem: EditorItem = { type: "spacer", id: entry, label: getSpacerLabel(entry) };
                if (pastDivider) {
                    hidden.push(spacerItem);
                } else {
                    ordered.push(spacerItem);
                }
                continue;
            }
            const signup = confirmedMap.get(entry);
            if (signup) {
                const item: EditorItem = { type: "player", signup };
                if (pastDivider) {
                    hidden.push(item);
                } else {
                    ordered.push(item);
                }
                confirmedMap.delete(entry);
            }
        }
        // New confirmed players go to visible by default
        for (const signup of confirmedMap.values()) {
            ordered.push({ type: "player", signup });
        }
        return { visible: ordered, hidden };
    };

    const initial = buildInitialOrder();
    const [visibleItems, setVisibleItems] = useState(initial.visible);
    const [hiddenItems, setHiddenItems] = useState(initial.hidden);

    const itemToKey = (item: EditorItem) =>
        item.type === "spacer" ? item.id : item.signup.user_id;

    const itemToData = (item: EditorItem) =>
        item.type === "spacer" ? setSpacerLabel(item.id, item.label) : item.signup.user_id;

    // Expose current order to dialog via ref
    useImperativeHandle(ref, () => ({
        getCurrentData: () => [
            ...visibleItems.map(itemToData),
            ...(hiddenItems.length > 0 ? ["__HIDDEN__", ...hiddenItems.map(itemToData)] : []),
        ],
    }));

    const hideItem = (index: number) => {
        setVisibleItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setHiddenItems((h) => [...h, moved]);
            return next;
        });
    };

    const showItem = (index: number) => {
        setHiddenItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setVisibleItems((v) => [...v, moved]);
            return next;
        });
    };

    const addSpacer = () => {
        setVisibleItems((prev) => [{ type: "spacer", id: createSpacerEntry(), label: "" }, ...prev]);
    };

    const updateSpacerLabel = (section: "visible" | "hidden", index: number, label: string) => {
        if (section === "visible") {
            setVisibleItems((prev) => prev.map((item, i) =>
                i === index && item.type === "spacer" ? { ...item, label } : item
            ));
        } else {
            setHiddenItems((prev) => prev.map((item, i) =>
                i === index && item.type === "spacer" ? { ...item, label } : item
            ));
        }
    };

    const removeItem = (section: "visible" | "hidden", index: number) => {
        if (section === "visible") {
            setVisibleItems((prev) => prev.filter((_, i) => i !== index));
        } else {
            setHiddenItems((prev) => prev.filter((_, i) => i !== index));
        }
    };

    if (confirmed.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-4">
                No confirmed sign-ups to reorder.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Drag players to set the order. Players below the divider are hidden from the view.
            </p>
            <button
                onClick={addSpacer}
                className="flex items-center gap-1.5 text-xs font-medium border border-dashed border-border rounded-md px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/50 transition-colors cursor-pointer"
            >
                <Plus className="h-3.5 w-3.5" />
                Add Spacer
            </button>
            <DraggableList
                items={visibleItems}
                onReorder={(next) => {
                    setVisibleItems(next);
                }}
                keyExtractor={itemToKey}
                renderItem={(item, index) => {
                    if (item.type === "spacer") {
                        return (
                            <>
                                <span className="flex-1 flex items-center gap-2">
                                    <span className="border-t border-dashed border-muted-foreground/50 w-4 shrink-0" />
                                    <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => updateSpacerLabel("visible", index, e.target.value)}
                                        placeholder="name your spacer"
                                        className="text-xs text-muted-foreground bg-transparent border-none outline-none w-full min-w-0 placeholder:text-muted-foreground/50"
                                    />
                                    <span className="border-t border-dashed border-muted-foreground/50 w-4 shrink-0" />
                                </span>
                                <button
                                    onClick={() => removeItem("visible", index)}
                                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                                    title="Remove spacer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </>
                        );
                    }
                    return (
                        <>
                            <span className="font-mono text-xs text-muted-foreground w-6">
                                {visibleItems.slice(0, index).filter((i) => i.type === "player").length + 1}
                            </span>
                            <span className="text-sm flex-1">{displayName(item.signup.profiles)}</span>
                            <button
                                onClick={() => hideItem(index)}
                                className="text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Hide player"
                            >
                                <EyeOff className="h-3.5 w-3.5" />
                            </button>
                        </>
                    );
                }}
                hiddenItems={hiddenItems}
                onHiddenReorder={(next) => {
                    setHiddenItems(next);
                }}
                renderHiddenItem={(item, index) => {
                    if (item.type === "spacer") {
                        return (
                            <>
                                <span className="flex-1 flex items-center gap-2">
                                    <span className="border-t border-dashed border-muted-foreground/50 w-4 shrink-0" />
                                    <input
                                        type="text"
                                        value={item.label}
                                        onChange={(e) => updateSpacerLabel("hidden", index, e.target.value)}
                                        placeholder="name your spacer"
                                        className="text-xs text-muted-foreground bg-transparent border-none outline-none w-full min-w-0 placeholder:text-muted-foreground/50"
                                    />
                                    <span className="border-t border-dashed border-muted-foreground/50 w-4 shrink-0" />
                                </span>
                                <button
                                    onClick={() => removeItem("hidden", index)}
                                    className="text-muted-foreground hover:text-destructive cursor-pointer"
                                    title="Remove spacer"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </>
                        );
                    }
                    return (
                        <>
                            <span className="font-mono text-xs text-muted-foreground w-6">
                                —
                            </span>
                            <span className="text-sm flex-1">{displayName(item.signup.profiles)}</span>
                            <button
                                onClick={() => showItem(index)}
                                className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                                title="Show player"
                            >
                                show
                            </button>
                        </>
                    );
                }}
                onHide={hideItem}
                onShow={showItem}
                className="max-h-[60vh] overflow-y-auto"
            />
        </div>
    );
}
