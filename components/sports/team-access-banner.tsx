"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Clock, XCircle } from "lucide-react";
import { requestTeamAccess } from "@/lib/actions/team-access";
import type { AccessRequestStatus } from "@/lib/supabase/types";
import { colors } from "@/lib/styles";
import StatusBanner from "@/components/sports/status-banner";

interface TeamAccessBannerProps {
  requestStatus: AccessRequestStatus | null;
  sport: string;
  /** Tab label(s) describing what's restricted (e.g. "scheduled games"). */
  label: string;
  /** Banner message describing what access grants. */
  bannerMessage?: string;
}

export default function TeamAccessBanner({
  requestStatus,
  sport,
  label,
  bannerMessage,
}: TeamAccessBannerProps) {
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(requestStatus);
  const restrictedLabels = label;

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
      <StatusBanner
        variant="warning"
        icon={<Clock className={`h-5 w-5 ${colors.warning} shrink-0 mt-0.5`} />}
        title="Request pending"
        message={<>Your request to join the team is awaiting leader approval. You&apos;ll be able to sign up for {restrictedLabels} once approved.</>}
      />
    );
  }

  if (localStatus === "rejected") {
    return (
      <StatusBanner
        variant="destructive"
        icon={<XCircle className={`h-5 w-5 ${colors.destructive} shrink-0 mt-0.5`} />}
        title="Request denied"
        message="Your request to join the team was not approved. Please contact a leader if you believe this is an error."
      />
    );
  }

  return (
    <StatusBanner
      variant="info"
      icon={<Shield className="h-5 w-5 text-info shrink-0 mt-0.5" />}
      title="Team members only"
      message={<>{bannerMessage || <>{restrictedLabels.charAt(0).toUpperCase() + restrictedLabels.slice(1)} are reserved for approved team members. Request access to sign up for those sessions.</>}</>}
    >
      <Button
        size="sm"
        onClick={handleRequest}
        disabled={pending}
      >
        {pending ? "Requesting..." : "Request to join"}
      </Button>
    </StatusBanner>
  );
}
