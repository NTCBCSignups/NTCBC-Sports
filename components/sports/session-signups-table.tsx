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
  const activeSignups = allSignups.filter((s) => s.status !== "declined");
  const declinedSignups = allSignups.filter((s) => s.status === "declined");
  const sortedSignups = [...activeSignups, ...declinedSignups];

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
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
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-12">#</TableHead>
              <TableHead className="w-8 px-1"></TableHead>
              <TableHead>Name</TableHead>
              {showTimestamp && <TableHead>Signed up</TableHead>}
              <TableHead className={renderActions ? "" : "sticky right-0 bg-muted/50 border-l"}>
                Status
              </TableHead>
              {renderActions && (
                <TableHead className="text-right">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {(() => {
              let activeIndex = 0;
              let declinedIndex = 0;
              const colCount = 3 + (showTimestamp ? 1 : 0) + 1 + (renderActions ? 1 : 0);
              return sortedSignups.map((signup) => {
                const isCurrentUser = currentUserId === signup.user_id;
                const isDeclined = signup.status === "declined";
                const groupIndex = isDeclined ? ++declinedIndex : ++activeIndex;
                const showDivider = isDeclined && declinedIndex === 1;
                return (
                  <Fragment key={signup.id}>
                    {showDivider && (
                      <TableRow className="pointer-events-none">
                        <TableCell colSpan={colCount} className="py-1 px-4">
                          <div className="border-t border-dashed border-gray-300" />
                        </TableCell>
                      </TableRow>
                    )}
                    <TableRow className={`group ${isCurrentUser ? "bg-blue-50" : ""}`}>
                      <TableCell className="font-mono text-xs">
                        {groupIndex}
                      </TableCell>
                      <TableCell className="px-1 align-middle">
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
                      <TableCell className={renderActions ? "" : `sticky right-0 border-l group-hover:bg-muted/50 ${isCurrentUser ? "bg-blue-50" : "bg-white"}`}>
                        <StatusBadge status={signup.status as "confirmed" | "waitlisted" | "declined"} />
                      </TableCell>
                      {renderActions && (
                        <TableCell className="text-right">
                          {renderActions(signup)}
                        </TableCell>
                      )}
                    </TableRow>
                  </Fragment>
                );
              });
            })()}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
