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
import { cn } from "@/lib/utils";
import { displayName } from "@/lib/format";
import type { SessionViewProps } from "@/components/sports/session/session-views/interfaces";
import { ALL_POSITIONS, POSITION_GROUPS, getEffectiveAssignment, parseData } from "./fielding-data";
import { CollapsibleDiamond, FieldingTable } from "./fielding-shared";

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
                                            const positions = ALL_POSITIONS.filter(
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
                                                        {positions.length > 0
                                                            ? positions.map((p) => p.label).join(", ")
                                                            : "—"}
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
