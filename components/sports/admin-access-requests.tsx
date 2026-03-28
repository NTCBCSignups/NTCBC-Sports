"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
      <p className="text-sm text-gray-500 py-4">No pending access requests.</p>
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
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((request) => (
            <TableRow key={request.id}>
              <TableCell>
                {request.profiles?.full_name ?? "Unknown"}
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {request.profiles?.email ?? "—"}
              </TableCell>
              <TableCell>
                {request.status === "pending" && (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Pending
                  </Badge>
                )}
                {request.status === "approved" && (
                  <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                    Approved
                  </Badge>
                )}
                {request.status === "rejected" && (
                  <Badge className="bg-red-100 text-red-800 border-red-200 hover:bg-red-100">
                    Rejected
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-xs text-gray-500">
                {new Date(request.created_at).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </TableCell>
              <TableCell className="text-right">
                {request.status === "pending" && (
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReview(request.id, "approved")}
                      disabled={pending === request.id}
                      className="text-green-600 hover:text-green-700"
                      title="Approve"
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleReview(request.id, "rejected")}
                      disabled={pending === request.id}
                      className="text-red-600 hover:text-red-700"
                      title="Reject"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
