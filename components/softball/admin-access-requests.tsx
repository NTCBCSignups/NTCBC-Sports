"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { colors } from "@/lib/styles";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Check, X } from "lucide-react";
import { reviewTeamAccessRequest } from "@/app/softball/actions/team-access";
import { StatusBadge } from "@/components/badges";
import { displayName } from "@/lib/format";
import type { Profile, AccessRequestStatus } from "@/lib/supabase/types";

interface AccessRequestRow {
  id: string;
  user_id: string;
  status: AccessRequestStatus;
  created_at: string;
  profiles: Profile | null;
}

interface AdminAccessRequestsProps {
  requests: AccessRequestRow[];
}

export default function AdminAccessRequests({
  requests,
}: AdminAccessRequestsProps) {
  const [pending, setPending] = useState<string | null>(null);

  const handleReview = async (
    requestId: string,
    status: "approved" | "rejected",
  ) => {
    setPending(requestId);
    await reviewTeamAccessRequest(requestId, status);
    setPending(null);
  };

  if (requests.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No access requests.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Requested</TableHead>
            <TableHead className="text-center">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                {displayName(request.profiles)}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {request.profiles?.email ?? "—"}
              </TableCell>
              <TableCell>
                <StatusBadge status={request.status} />
              </TableCell>
              <TableCell className="text-xs text-gray-500">
                {new Date(request.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell>
                <div className="flex justify-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReview(request.id, "approved")}
                    disabled={pending === request.id || request.status === "approved"}
                    className={`${colors.successHover} disabled:opacity-20`}
                    title="Approve"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleReview(request.id, "rejected")}
                    disabled={pending === request.id || request.status === "rejected"}
                    className={`${colors.destructiveHover} disabled:opacity-20`}
                    title="Reject"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
