"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp, X } from "lucide-react";
import { adminUpdateSignupStatus } from "@/lib/actions/signups";
import SessionSignupsTable, {
  type SignupRow,
} from "@/components/sports/session/session-signups-table";
import { colors } from "@/lib/styles";
import { toast } from "sonner";

interface AdminSessionSignupsProps {
  sport: string;
  sessionId: string;
  signups: SignupRow[];
  playerCap: number | null;
  teamMemberIds?: Set<string>;
}

export default function AdminSessionSignups({
  sport,
  sessionId,
  signups,
  playerCap,
  teamMemberIds,
}: AdminSessionSignupsProps) {
  const [pending, setPending] = useState<string | null>(null);

  const handlePromote = async (signupId: string) => {
    setPending(signupId);
    const result = await adminUpdateSignupStatus(sport, signupId, "confirmed", sessionId);
    if (result.error) toast.error(result.error);
    setPending(null);
  };

  const handleCancel = async (signupId: string) => {
    setPending(signupId);
    const result = await adminUpdateSignupStatus(sport, signupId, "cancelled", sessionId);
    if (result.error) toast.error(result.error);
    setPending(null);
  };

  return (
    <SessionSignupsTable
      signups={signups}
      teamMemberIds={teamMemberIds ?? new Set()}
      playerCap={playerCap}
      renderActions={(signup) => (
        <div className="flex justify-end gap-1.5">
          {signup.status === "waitlisted" && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handlePromote(signup.id)}
              disabled={pending === signup.id}
              title="Promote to confirmed"
              className="h-9 w-9"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleCancel(signup.id)}
            disabled={pending === signup.id}
            title="Remove signup"
            className={`${colors.destructiveHover} h-9 w-9`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
    />
  );
}
