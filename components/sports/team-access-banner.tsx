"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Shield, Clock, XCircle } from "lucide-react";
import { requestTeamAccess } from "@/app/softball/actions/team-access";
import type { AccessRequestStatus } from "@/lib/supabase/types";

interface TeamAccessBannerProps {
  requestStatus: AccessRequestStatus | null;
}

export default function TeamAccessBanner({
  requestStatus,
}: TeamAccessBannerProps) {
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(requestStatus);

  const handleRequest = async () => {
    setPending(true);
    const result = await requestTeamAccess();
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
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex items-start gap-3">
        <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-amber-900">Request Pending</p>
          <p className="text-sm text-amber-700">
            Your request to join the team is awaiting admin approval. You&apos;ll
            be able to sign up for scheduled games once approved.
          </p>
        </div>
      </div>
    );
  }

  if (localStatus === "rejected") {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 flex items-start gap-3">
        <XCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-red-900">Request Denied</p>
          <p className="text-sm text-red-700">
            Your request to join the team was not approved. Please contact an
            admin if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 flex items-start gap-3">
      <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="font-medium text-blue-900">Team Members Only</p>
        <p className="text-sm text-blue-700 mb-3">
          Scheduled games are reserved for approved team members. Request access
          to start signing up.
        </p>
        <Button
          size="sm"
          onClick={handleRequest}
          disabled={pending}
          className="rounded-full"
        >
          {pending ? "Requesting..." : "Request to Join"}
        </Button>
      </div>
    </div>
  );
}
