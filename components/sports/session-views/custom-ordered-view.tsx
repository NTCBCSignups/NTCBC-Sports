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
import { EyeOff } from "lucide-react";
import { DraggableList } from "@/components/ui/draggable-list";
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
 * Exposes getCurrentData() via ref for the dialog to pull on save.
 */
export function CustomOrderedEditor({
    signups,
    viewData,
    ref,
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

    // Expose current order to dialog via ref
    useImperativeHandle(ref, () => ({
        getCurrentData: () => [
            ...visibleItems.map((s) => s.user_id),
            ...(hiddenItems.length > 0 ? ["__HIDDEN__", ...hiddenItems.map((s) => s.user_id)] : []),
        ],
    }));

    const hidePlayer = (index: number) => {
        setVisibleItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setHiddenItems((h) => [...h, moved]);
            return next;
        });
    };

    const showPlayer = (index: number) => {
        setHiddenItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(index, 1);
            setVisibleItems((v) => [...v, moved]);
            return next;
        });
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
            <DraggableList
                items={visibleItems}
                onReorder={(next) => {
                    setVisibleItems(next);
                }}
                keyExtractor={(s) => s.user_id}
                renderItem={(signup, index) => (
                    <>
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
                    </>
                )}
                hiddenItems={hiddenItems}
                onHiddenReorder={(next) => {
                    setHiddenItems(next);
                }}
                renderHiddenItem={(signup, index) => (
                    <>
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
                    </>
                )}
                onHide={hidePlayer}
                onShow={showPlayer}
                className="max-h-80 overflow-y-auto"
            />
        </div>
    );
}
