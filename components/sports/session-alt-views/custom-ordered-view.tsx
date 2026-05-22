"use client";

import { Fragment } from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { TeamMemberBadge } from "@/components/sports/badges";
import SignupSummaryHeader from "@/components/sports/signup-summary-header";
import { displayName } from "@/lib/format";
import type { AlternateViewProps } from "./interfaces";

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
}: AlternateViewProps) {
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
