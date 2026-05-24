"use client";

import { useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import { adminUpdateSignupStatus } from "@/lib/actions/signups";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { SessionViewProps, SessionViewEditorProps } from "./interfaces";

/**
 * The default attendance view — wraps SessionSignupsTable.
 * No stored data; simply shows signups with timestamps.
 * When admin context is provided, renders promote/demote action buttons.
 */
export default function AttendanceView({
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
    isAdmin,
    sport,
    sessionId,
}: SessionViewProps) {
    const [pending, setPending] = useState<string | null>(null);

    const handleStatusChange = async (signupId: string, status: "confirmed" | "waitlisted") => {
        if (!sport || !sessionId) return;
        setPending(signupId);
        await adminUpdateSignupStatus(sport, signupId, status, sessionId);
        setPending(null);
    };

    const renderActions = isAdmin && sport && sessionId
        ? (signup: SignupRow) => (
            <>
                {signup.status === "confirmed" && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStatusChange(signup.id, "waitlisted")}
                        disabled={pending === signup.id}
                        title="Move to waitlist"
                    >
                        <ArrowDown className="h-4 w-4" />
                    </Button>
                )}
                {signup.status === "waitlisted" && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleStatusChange(signup.id, "confirmed")}
                        disabled={pending === signup.id}
                        title="Promote to confirmed"
                    >
                        <ArrowUp className="h-4 w-4" />
                    </Button>
                )}
            </>
        )
        : undefined;

    return (
        <SessionSignupsTable
            signups={signups}
            teamMemberIds={teamMemberIds}
            playerCap={playerCap}
            currentUserId={currentUserId}
            showTimestamp
            renderActions={renderActions}
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
