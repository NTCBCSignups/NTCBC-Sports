"use client";

import { useState } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { GripVertical, EyeOff } from "lucide-react";
import { TeamMemberBadge } from "@/components/sports/badges";
import SignupSummaryHeader from "@/components/sports/signup-summary-header";
import { displayName } from "@/lib/format";
import type { SessionViewProps, SessionViewEditorProps } from "./interfaces";

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

    // Build ordered list: ordered confirmed first, then unordered confirmed appended
    const orderedConfirmed: typeof confirmed = [];
    const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));

    for (const userId of visibleOrder) {
        const signup = confirmedMap.get(userId);
        if (signup) {
            orderedConfirmed.push(signup);
            confirmedMap.delete(userId);
        }
    }
    // Append any confirmed players not in the saved order (only if no divider set)
    if (dividerIdx === -1) {
        for (const signup of confirmedMap.values()) {
            orderedConfirmed.push(signup);
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
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            <TableHead className="w-12">#</TableHead>
                            <TableHead className="w-8 px-1"></TableHead>
                            <TableHead>Name</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {orderedConfirmed.map((signup, index) => {
                            const isCurrentUser = currentUserId === signup.user_id;
                            return (
                                <TableRow
                                    key={signup.id}
                                    className={isCurrentUser ? "bg-status-info" : ""}
                                >
                                    <TableCell className="font-mono text-xs">
                                        {index + 1}
                                    </TableCell>
                                    <TableCell className="px-1 align-middle">
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
            )}
        </div>
    );
}

/**
 * Generic ordered list editor — drag-drop reorderable list of confirmed signups.
 * Reports order changes to parent via onChange; no direct server calls.
 */
export function CustomOrderedEditor({
    signups,
    viewData,
    onChange,
}: SessionViewEditorProps) {
    const currentOrder = Array.isArray(viewData) ? (viewData as string[]) : [];
    const confirmed = signups.filter((s) => s.status === "confirmed");

    // Build initial order: saved order first, then any new confirmed players appended
    // The __HIDDEN__ sentinel separates visible from hidden players
    const buildInitialOrder = () => {
        const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));
        const ordered: typeof confirmed = [];
        const hidden: typeof confirmed = [];
        let pastDivider = false;

        for (const entry of currentOrder) {
            if (entry === "__HIDDEN__") {
                pastDivider = true;
                continue;
            }
            const signup = confirmedMap.get(entry);
            if (signup) {
                if (pastDivider) {
                    hidden.push(signup);
                } else {
                    ordered.push(signup);
                }
                confirmedMap.delete(entry);
            }
        }
        // New confirmed players go to visible by default
        for (const signup of confirmedMap.values()) {
            ordered.push(signup);
        }
        return { visible: ordered, hidden };
    };

    const initial = buildInitialOrder();
    const [visibleItems, setVisibleItems] = useState(initial.visible);
    const [hiddenItems, setHiddenItems] = useState(initial.hidden);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [dragSection, setDragSection] = useState<"visible" | "hidden" | null>(null);

    const emitChange = (visible: typeof confirmed, hidden: typeof confirmed) => {
        const order = [
            ...visible.map((s) => s.user_id),
            ...(hidden.length > 0 ? ["__HIDDEN__", ...hidden.map((s) => s.user_id)] : []),
        ];
        onChange(order);
    };

    const moveItem = (section: "visible" | "hidden", from: number, to: number) => {
        const setter = section === "visible" ? setVisibleItems : setHiddenItems;
        setter((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const handleDragStart = (section: "visible" | "hidden", index: number) => {
        setDragIndex(index);
        setDragSection(section);
    };

    const handleDragOver = (e: React.DragEvent, section: "visible" | "hidden", index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragSection === null) return;

        if (dragSection === section && dragIndex !== index) {
            moveItem(section, dragIndex, index);
            setDragIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setDragSection(null);
        emitChange(visibleItems, hiddenItems);
    };

    const hidePlayer = (index: number) => {
        setVisibleItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setHiddenItems((h) => {
                const newHidden = [...h, moved];
                emitChange(next, newHidden);
                return newHidden;
            });
            return next;
        });
    };

    const showPlayer = (index: number) => {
        setHiddenItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setVisibleItems((v) => {
                const newVisible = [...v, moved];
                emitChange(newVisible, next);
                return newVisible;
            });
            return next;
        });
    };

    // Cross-section drag: drop onto the divider to move between sections
    const handleDividerDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDividerDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (dragIndex === null || dragSection === null) return;
        if (dragSection === "visible") {
            hidePlayer(dragIndex);
        } else {
            showPlayer(dragIndex);
        }
        setDragIndex(null);
        setDragSection(null);
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
            <div className="space-y-1 max-h-80 overflow-y-auto">
                {visibleItems.map((signup, index) => (
                    <div
                        key={signup.user_id}
                        draggable
                        onDragStart={() => handleDragStart("visible", index)}
                        onDragOver={(e) => handleDragOver(e, "visible", index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                            dragIndex === index && dragSection === "visible" ? "bg-muted border-primary" : "bg-card"
                        }`}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground w-6">
                            {index + 1}
                        </span>
                        <span className="text-sm flex-1">{displayName(signup.profiles)}</span>
                        <button
                            onClick={() => hidePlayer(index)}
                            className="text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Hide player"
                        >
                            <EyeOff className="h-3.5 w-3.5" />
                        </button>
                    </div>
                ))}

                {/* Divider */}
                <div
                    onDragOver={handleDividerDragOver}
                    onDrop={handleDividerDrop}
                    className="flex items-center gap-2 py-2 my-1"
                >
                    <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
                    <span className="text-xs text-muted-foreground px-2">hidden below</span>
                    <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
                </div>

                {hiddenItems.map((signup, index) => (
                    <div
                        key={signup.user_id}
                        draggable
                        onDragStart={() => handleDragStart("hidden", index)}
                        onDragOver={(e) => handleDragOver(e, "hidden", index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing transition-colors opacity-50 ${
                            dragIndex === index && dragSection === "hidden" ? "bg-muted border-primary" : "bg-card"
                        }`}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground w-6">
                            —
                        </span>
                        <span className="text-sm flex-1">{displayName(signup.profiles)}</span>
                        <button
                            onClick={() => showPlayer(index)}
                            className="text-xs text-muted-foreground hover:text-foreground cursor-pointer"
                            title="Show player"
                        >
                            show
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
