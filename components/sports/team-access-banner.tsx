"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Clock, XCircle } from "lucide-react";
import { requestTeamAccess } from "@/lib/actions/team-access";
import { resolvedSportsConfig, AccessLevel, Role } from "@/config/config-resolver";
import type { AccessRequestStatus } from "@/lib/supabase/types";
import { colors, statusColors } from "@/lib/styles";

interface TeamAccessBannerProps {
  requestStatus: AccessRequestStatus | null;
  sport: string;
}

function getRestrictedTabLabels(sport: string): string {
  const config = resolvedSportsConfig[sport];
  const labels = config?.tabs
    ?.filter((t) => t.permissions[AccessLevel.signup] > Role.user)
    .map((t) => t.label.toLowerCase()) ?? [];
  if (labels.length === 0) return "restricted sessions";
  if (labels.length === 1) return labels[0];
  return labels.slice(0, -1).join(", ") + " and " + labels[labels.length - 1];
}

export default function TeamAccessBanner({
  requestStatus,
  sport,
}: TeamAccessBannerProps) {
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(requestStatus);
  const restrictedLabels = getRestrictedTabLabels(sport);

  const handleRequest = async () => {
    setPending(true);
    const result = await requestTeamAccess(sport);
    if (result.success) {
      setLocalStatus("pending");
    }
    setPending(false);
  };

  if (localStatus === "approved") {
    return null;
  }

  if (localStatus === "pending") {
    return (
      <div className={`rounded-lg border ${statusColors.amber.border} ${statusColors.amber.bg} p-4 flex items-start gap-3`}>
        <Clock className={`h-5 w-5 ${colors.warning} shrink-0 mt-0.5`} />
        <div>
          <p className="font-medium text-status-warning-foreground">Request pending</p>
          <p className="text-sm text-status-warning-foreground/80">
            Your request to join the team is awaiting leader approval. You&apos;ll be
            able to sign up for {restrictedLabels} once approved.
          </p>
        </div>
      </div>
    );
  }

  if (localStatus === "rejected") {
    return (
      <div className={`rounded-lg border ${statusColors.red.border} ${statusColors.red.bg} p-4 flex items-start gap-3`}>
        <XCircle className={`h-5 w-5 ${colors.destructive} shrink-0 mt-0.5`} />
        <div>
          <p className="font-medium text-status-destructive-foreground">Request denied</p>
          <p className="text-sm text-status-destructive-foreground/80">
            Your request to join the team was not approved. Please contact a
            leader if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-status-info-border bg-status-info p-4 flex items-start gap-3">
      <Shield className="h-5 w-5 text-info shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="font-medium text-status-info-foreground">Team members only</p>
        <p className="text-sm text-status-info-foreground/80 mb-3">
          {restrictedLabels.charAt(0).toUpperCase() + restrictedLabels.slice(1)} are reserved for approved team members.
          Request access to sign up for those sessions.
        </p>
        <Button
          size="sm"
          onClick={handleRequest}
          disabled={pending}
          className="rounded-full"
        >
          {pending ? "Requesting..." : "Request to join"}
        </Button>
      </div>
    </div>
  );
}
