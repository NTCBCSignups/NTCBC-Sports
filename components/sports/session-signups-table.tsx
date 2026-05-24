"use client";

import { Fragment, type ReactNode } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge, TeamMemberBadge } from "@/components/sports/badges";
import SignupSummaryHeader from "@/components/sports/signup-summary-header";
import LocalTimestamp from "@/components/sports/local-timestamp";
import { displayName } from "@/lib/format";
import type { Profile, SignupStatus } from "@/lib/supabase/types";

export interface SignupRow {
  id: string;
  user_id: string;
  status: SignupStatus;
  created_at: string;
  profiles: Profile | null;
}

interface SessionSignupsTableProps {
  signups: SignupRow[];
  teamMemberIds: Set<string>;
  playerCap: number | null;
  currentUserId?: string | null;
  showTimestamp?: boolean;
  renderActions?: (signup: SignupRow) => ReactNode;
}

export default function SessionSignupsTable({
  signups,
  teamMemberIds,
  playerCap,
  currentUserId,
  showTimestamp,
  renderActions,
}: SessionSignupsTableProps) {
  const allSignups = signups.filter((s) => s.status !== "cancelled");
  const confirmed = allSignups.filter((s) => s.status === "confirmed");
  const waitlisted = allSignups.filter((s) => s.status === "waitlisted");
  const declinedSignups = allSignups.filter((s) => s.status === "declined");
  const sortedSignups = [...confirmed, ...waitlisted, ...declinedSignups];

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <SignupSummaryHeader
        confirmedCount={confirmed.length}
        waitlistedCount={waitlisted.length}
        playerCap={playerCap}
      />

      {allSignups.length === 0 ? (
        <div className="p-6 text-center text-sm text-muted-foreground">
          No sign-ups yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-8">#</TableHead>
              <TableHead className="w-6 px-0"></TableHead>
              <TableHead>Name</TableHead>
              {showTimestamp && <TableHead>Signed up</TableHead>}
              <TableHead className="sticky right-0 bg-card border-l z-10">
                <div className="absolute inset-0 bg-muted/50" />
                <span className="relative">Status</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              let confirmedIndex = 0;
              let waitlistedIndex = 0;
              let declinedIndex = 0;
              const colCount = 3 + (showTimestamp ? 1 : 0) + 1;
              return sortedSignups.map((signup) => {
                const isCurrentUser = currentUserId === signup.user_id;
                const isWaitlisted = signup.status === "waitlisted";
                const isDeclined = signup.status === "declined";
                let groupIndex: number;
                if (isDeclined) groupIndex = ++declinedIndex;
                else if (isWaitlisted) groupIndex = ++waitlistedIndex;
                else groupIndex = ++confirmedIndex;
                const showWaitlistDivider = isWaitlisted && waitlistedIndex === 1;
                const showDeclinedDivider = isDeclined && declinedIndex === 1;
                return (
                  <Fragment key={signup.id}>
                    {showWaitlistDivider && (
                      <TableRow className="pointer-events-none">
                        <TableCell colSpan={colCount} className="py-1 px-4">
                          <div className="border-t border-dashed border-border" />
                        </TableCell>
                      </TableRow>
                    )}
                    {showDeclinedDivider && (
                      <TableRow className="pointer-events-none">
                        <TableCell colSpan={colCount} className="py-1 px-4">
                          <div className="border-t border-dashed border-border" />
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className={`group ${isCurrentUser ? "bg-status-info" : ""}`}>
                      <TableCell className="font-mono text-xs">
                        {groupIndex}
                      </TableCell>
                      <TableCell className="px-0 align-middle">
                        {teamMemberIds.has(signup.user_id) && <TeamMemberBadge />}
                      </TableCell>
                      <TableCell>
                        {displayName(signup.profiles)}
                      </TableCell>
                      {showTimestamp && (
                        <TableCell className="text-xs">
                          <LocalTimestamp date={signup.created_at} />
                        </TableCell>
                      )}
                      <TableCell className={`sticky right-0 border-l group-hover:bg-muted ${isCurrentUser ? "bg-status-info" : "bg-card"}`}>
                        <div className="flex items-center justify-between gap-1">
                          <StatusBadge status={signup.status as "confirmed" | "waitlisted" | "declined"} />
                          {renderActions && renderActions(signup)}
                        </div>
                      </TableCell>
                    </TableRow>
                  </Fragment>
                );
              });
            })()}
          </TableBody>
        </Table>
        </div>
      )}
    </div>
  );
}
