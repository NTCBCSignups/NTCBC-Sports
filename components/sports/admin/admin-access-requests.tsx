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
import { reviewTeamAccessRequest } from "@/lib/actions/team-access";
import { StatusBadge } from "@/components/sports/badges";
import { formatDate } from "@/lib/format";
import { displayName } from "@/lib/format";
import { toast } from "sonner";
import type { Profile, AccessRequestStatus } from "@/lib/supabase/types";

interface AccessRequestRow {
  id: string;
  user_id: string;
  status: AccessRequestStatus;
  created_at: string;
  profiles: Profile | null;
}

interface AdminAccessRequestsProps {
  sport: string;
  requests: AccessRequestRow[];
}

export default function AdminAccessRequests({ sport, requests }: AdminAccessRequestsProps) {
  const [pending, setPending] = useState<string | null>(null);

  const handleReview = async (requestId: string, status: "approved" | "rejected") => {
    setPending(requestId);
    const result = await reviewTeamAccessRequest(sport, requestId, status);
    if (result.error) toast.error(result.error);
    setPending(null);
  };

  if (requests.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No access requests.</p>;
  }

  return (
    <>
      {/* Mobile card layout */}
      <div className="md:hidden space-y-3">
        {requests.map((request) => (
          <div key={request.id} className="rounded-lg border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">{displayName(request.profiles)}</p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {request.profiles?.email ?? "—"}
                </p>
              </div>
              <StatusBadge status={request.status} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {formatDate(request.created_at.split("T")[0]!)}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview(request.id, "approved")}
                  disabled={pending === request.id || request.status === "approved"}
                  className={`${colors.successHover} disabled:opacity-20 h-9 px-3`}
                >
                  <Check className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleReview(request.id, "rejected")}
                  disabled={pending === request.id || request.status === "rejected"}
                  className={`${colors.destructiveHover} disabled:opacity-20 h-9 px-3`}
                >
                  <X className="h-4 w-4 mr-1.5" />
                  Reject
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop table layout */}
      <div className="hidden md:block overflow-hidden rounded-lg border bg-card">
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
                <TableCell>{displayName(request.profiles)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {request.profiles?.email ?? "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={request.status} />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(request.created_at.split("T")[0]!)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(request.id, "approved")}
                      disabled={pending === request.id || request.status === "approved"}
                      className={`${colors.successHover} disabled:opacity-20 h-8 px-2.5`}
                    >
                      <Check className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleReview(request.id, "rejected")}
                      disabled={pending === request.id || request.status === "rejected"}
                      className={`${colors.destructiveHover} disabled:opacity-20 h-8 px-2.5`}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
