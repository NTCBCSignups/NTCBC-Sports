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
import { GripVertical } from "lucide-react";
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

    // Build ordered list: ordered confirmed first, then unordered confirmed appended
    const orderedConfirmed: typeof confirmed = [];
    const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));

    for (const userId of order) {
        const signup = confirmedMap.get(userId);
        if (signup) {
            orderedConfirmed.push(signup);
            confirmedMap.delete(userId);
        }
    }
    // Append any confirmed players not in the saved order
    for (const signup of confirmedMap.values()) {
        orderedConfirmed.push(signup);
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
    const buildInitialOrder = () => {
        const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));
        const ordered: typeof confirmed = [];

        for (const userId of currentOrder) {
            const signup = confirmedMap.get(userId);
            if (signup) {
                ordered.push(signup);
                confirmedMap.delete(userId);
            }
        }
        for (const signup of confirmedMap.values()) {
            ordered.push(signup);
        }
        return ordered;
    };

    const [items, setItems] = useState(buildInitialOrder);
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const moveItem = (from: number, to: number) => {
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) {
            moveItem(dragIndex, index);
            setDragIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        // Report updated order to parent
        const newOrder = items.map((s) => s.user_id);
        onChange(newOrder);
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
                Drag players to set the order.
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
                {items.map((signup, index) => (
                    <div
                        key={signup.user_id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                            dragIndex === index ? "bg-muted border-primary" : "bg-card"
                        }`}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground w-6">
                            {index + 1}
                        </span>
                        <span className="text-sm">{displayName(signup.profiles)}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
