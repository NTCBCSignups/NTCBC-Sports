"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowUp, X, ShieldCheck } from "lucide-react";
import { adminUpdateSignupStatus } from "@/app/softball/actions/signups";
import StatusBadge from "@/components/status-badge";
import SignupSummaryHeader from "@/components/softball/signup-summary-header";
import { displayName } from "@/lib/format";
import type { Profile, SignupStatus } from "@/lib/supabase/types";

interface SignupRow {
  id: string;
  user_id: string;
  status: SignupStatus;
  created_at: string;
  profiles: Profile | null;
}

interface AdminSessionSignupsProps {
  sessionId: string;
  signups: SignupRow[];
  playerCap: number | null;
  teamMemberIds?: Set<string>;
}

export default function AdminSessionSignups({
  sessionId,
  signups,
  playerCap,
  teamMemberIds,
}: AdminSessionSignupsProps) {
  const [pending, setPending] = useState<string | null>(null);

  const activeSignups = signups.filter((s) => s.status !== "cancelled");
  const confirmed = activeSignups.filter((s) => s.status === "confirmed");
  const waitlisted = activeSignups.filter((s) => s.status === "waitlisted");

  const handlePromote = async (signupId: string) => {
    setPending(signupId);
    await adminUpdateSignupStatus(signupId, "confirmed", sessionId);
    setPending(null);
  };

  const handleCancel = async (signupId: string) => {
    setPending(signupId);
    await adminUpdateSignupStatus(signupId, "cancelled", sessionId);
    setPending(null);
  };

  if (activeSignups.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No signups for this session.</p>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <SignupSummaryHeader
        confirmedCount={confirmed.length}
        waitlistedCount={waitlisted.length}
        playerCap={playerCap}
      />
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead className="w-8 px-1"></TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeSignups.map((signup, index) => (
            <TableRow key={signup.id}>
              <TableCell className="font-mono text-xs">{index + 1}</TableCell>
              <TableCell className="px-1 align-middle">
                {teamMemberIds?.has(signup.user_id) && (
                  <span className="flex items-center justify-center text-green-600" title="Team member">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                )}
              </TableCell>
              <TableCell>
                {displayName(signup.profiles)}
              </TableCell>
              <TableCell>
                <StatusBadge status={signup.status as "confirmed" | "waitlisted"} />
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {signup.status === "waitlisted" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePromote(signup.id)}
                      disabled={pending === signup.id}
                      title="Promote to confirmed"
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
                    className="text-red-600 hover:text-red-700"
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
