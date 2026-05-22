"use client";

import { useImperativeHandle } from "react";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import type { SessionViewProps, SessionViewEditorProps } from "./interfaces";

/**
 * The default attendance view — wraps SessionSignupsTable.
 * No stored data; simply shows signups with timestamps.
 */
export default function AttendanceView({
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
}: SessionViewProps) {
    return (
        <SessionSignupsTable
            signups={signups}
            teamMemberIds={teamMemberIds}
            playerCap={playerCap}
            currentUserId={currentUserId}
            showTimestamp
        />
    );
}

/**
 * Editor for the attendance view — no configuration needed.
 */
export function AttendanceEditor({ ref }: SessionViewEditorProps) {
    useImperativeHandle(ref, () => ({
        getCurrentData: () => null,
    }));

    return (
        <p className="text-sm text-muted-foreground py-4">
            This view has no configuration. It displays sign-ups in order of sign-up time.
        </p>
    );
}
