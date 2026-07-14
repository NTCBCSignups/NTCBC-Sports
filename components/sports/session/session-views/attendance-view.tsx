"use client";

import { useImperativeHandle, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import SessionSignupsTable from "@/components/sports/session/session-signups-table";
import { adminUpdateSignupStatus } from "@/lib/actions/signups";
import { toastClasses } from "@/lib/styles";
import { displayName } from "@/lib/format";
import type { SignupRow } from "@/components/sports/session/session-signups-table";
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
  isSessionAdmin: isAdmin,
  sport,
  sessionId,
}: SessionViewProps) {
  const [pending, setPending] = useState<string | null>(null);

  const handleStatusChange = async (signup: SignupRow, status: "confirmed" | "waitlisted") => {
    if (!sport || !sessionId) return;
    setPending(signup.id);
    const result = await adminUpdateSignupStatus(sport, signup.id, status, sessionId);
    setPending(null);
    if ("error" in result) {
      toast(result.error, { className: toastClasses.red });
    } else {
      const name = displayName(signup.profiles);
      const message =
        status === "confirmed" ? `${name} promoted to confirmed` : `${name} moved to waitlist`;
      toast(message, {
        className: status === "confirmed" ? toastClasses.green : toastClasses.amber,
      });
    }
  };

  const renderActions =
    isAdmin && sport && sessionId
      ? (signup: SignupRow) => (
          <>
            {signup.status === "confirmed" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleStatusChange(signup, "waitlisted")}
                disabled={pending === signup.id}
                title="Move to waitlist"
              >
                <ArrowDown className="h-3 w-3" />
              </Button>
            )}
            {signup.status === "waitlisted" && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => handleStatusChange(signup, "confirmed")}
                disabled={pending === signup.id}
                title="Promote to confirmed"
              >
                <ArrowUp className="h-3 w-3" />
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
