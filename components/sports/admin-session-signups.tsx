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
import { ArrowDown, ArrowUp, X } from "lucide-react";
import { adminUpdateSignupStatus } from "@/app/softball/actions/signups";
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
}

export default function AdminSessionSignups({
  sessionId,
  signups,
  playerCap,
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

  const handleDemote = async (signupId: string) => {
    setPending(signupId);
    await adminUpdateSignupStatus(signupId, "waitlisted", sessionId);
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
      <div className="flex border-b">
        <div className="flex-1 px-4 py-3 border-r">
          <p className="text-xs text-muted-foreground mb-0.5">Confirmed</p>
          <p className="text-sm font-semibold text-gray-900">
            {confirmed.length}{playerCap ? ` / ${playerCap}` : ""}
          </p>
        </div>
        <div className="flex-1 px-4 py-3">
          <p className="text-xs text-muted-foreground mb-0.5">Waitlisted</p>
          <p className="text-sm font-semibold text-gray-900">
            {waitlisted.length}
          </p>
        </div>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-12">#</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {activeSignups.map((signup, index) => (
            <TableRow key={signup.id}>
              <TableCell className="font-mono text-xs">{index + 1}</TableCell>
              <TableCell>
                {signup.profiles?.full_name ??
                  signup.profiles?.email ??
                  "Unknown"}
              </TableCell>
              <TableCell>
                {signup.status === "confirmed" ? (
                  <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                    Confirmed
                  </Badge>
                ) : (
                  <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                    Waitlist
                  </Badge>
                )}
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
                  {signup.status === "confirmed" && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDemote(signup.id)}
                      disabled={pending === signup.id}
                      title="Move to waitlist"
                    >
                      <ArrowDown className="h-4 w-4" />
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
