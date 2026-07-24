"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Trash2, UserCheck } from "lucide-react";
import { WaiverBadge } from "@/components/sports/badges";
import type { WaiverStatus } from "@/lib/supabase/types";
import { colors, statusColors } from "@/lib/styles";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  syncCcsaWaivers,
  approveCcsaPlayersForTeam,
  deleteAllCcsaPlayers,
} from "@/lib/softball/ccsa-sync";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { PlayerPreviewEntry, PlayersPreview } from "@/lib/softball/ccsa-preview";

// ─── Types ──────────────────────────────────────────────────────────────────

interface TeamMember {
  email: string;
  full_name: string;
}

interface ProfileEntry {
  email: string;
  full_name: string;
}

type AccessStatus =
  | { status: "on-team"; via: "exact" | "suggested"; match: TeamMember }
  | { status: "has-account"; via: "exact" | "suggested"; match: ProfileEntry }
  | { status: "none" };

interface CcsaPlayersTabProps {
  playersPreview: PlayersPreview | null;
  teamMembers: TeamMember[];
  allProfiles: ProfileEntry[];
  pending: boolean;
  setPending: (v: boolean) => void;
  onSyncResult: (msg: string | null) => void;
  onError: (msg: string | null) => void;
  onRefresh: () => Promise<void>;
}

// ─── Matching helpers ────────────────────────────────────────────────────────

function fuzzyNameMatch<T extends { full_name: string }>(
  player: PlayerPreviewEntry,
  list: T[],
): T | undefined {
  const pFirst = player.first_name.toLowerCase().trim();
  const pLast = player.last_name.toLowerCase().trim();

  for (const m of list) {
    const parts = (m.full_name ?? "").toLowerCase().trim().split(/\s+/);
    if (parts.length < 2) continue;
    const mFirst = parts[0]!;
    const mLast = parts[parts.length - 1]!;
    if (mLast === pLast && (mFirst.includes(pFirst) || pFirst.includes(mFirst))) return m;
  }
  return undefined;
}

function getAccessStatus(
  player: PlayerPreviewEntry,
  teamMembers: TeamMember[],
  allProfiles: ProfileEntry[],
): AccessStatus {
  const teamEmail = teamMembers.find((m) => m.email.toLowerCase() === player.email.toLowerCase());
  if (teamEmail) return { status: "on-team", via: "exact", match: teamEmail };

  const teamName = fuzzyNameMatch(player, teamMembers);
  if (teamName) return { status: "on-team", via: "suggested", match: teamName };

  const profileEmail = allProfiles.find(
    (p) => p.email.toLowerCase() === player.email.toLowerCase(),
  );
  if (profileEmail) return { status: "has-account", via: "exact", match: profileEmail };

  const profileName = fuzzyNameMatch(player, allProfiles);
  if (profileName) return { status: "has-account", via: "suggested", match: profileName };

  return { status: "none" };
}

function getDismissedFallback(
  player: PlayerPreviewEntry,
  teamMembers: TeamMember[],
  allProfiles: ProfileEntry[],
): AccessStatus {
  const profileEmail = allProfiles.find(
    (pr) => pr.email.toLowerCase() === player.email.toLowerCase(),
  );
  if (!profileEmail) return { status: "none" };
  const isOnTeam = teamMembers.some(
    (tm) => tm.email.toLowerCase() === profileEmail.email.toLowerCase(),
  );
  return isOnTeam
    ? { status: "on-team", via: "exact", match: profileEmail }
    : { status: "has-account", via: "exact", match: profileEmail };
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function CcsaPlayersTab({
  playersPreview,
  teamMembers,
  allProfiles,
  pending,
  setPending,
  onSyncResult,
  onError,
  onRefresh,
}: CcsaPlayersTabProps) {
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set());

  const hasChanges =
    playersPreview &&
    (playersPreview.newCount > 0 ||
      playersPreview.updatedCount > 0 ||
      playersPreview.players.some(
        (p) => getAccessStatus(p, teamMembers, allProfiles).status !== "on-team",
      ));

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {hasChanges && (
          <Button
            size="sm"
            onClick={async () => {
              setPending(true);
              onError(null);
              const result = await syncCcsaWaivers();
              if (result.error) {
                onError(result.error);
              } else {
                const approveResult = await approveCcsaPlayersForTeam();
                if (approveResult.error) {
                  onError(approveResult.error);
                } else {
                  onSyncResult(
                    `Applied ${result.count} players${approveResult.count ? `, approved ${approveResult.count} for team` : ""}`,
                  );
                }
                await onRefresh();
              }
              setPending(false);
            }}
            disabled={pending}
            className="rounded-full ml-auto"
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            {pending ? "Applying..." : "Apply"}
          </Button>
        )}
      </div>

      {playersPreview && playersPreview.players.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">
            {playersPreview.teamName} · {playersPreview.players.length} players total
          </p>
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2 hidden xl:table-cell">CCSA Email</th>
                  <th className="px-4 py-2">Waiver</th>
                  <th className="sticky right-0 bg-muted px-3 py-2 border-l max-w-[120px] sm:max-w-none">
                    Team Access
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {playersPreview.players.map((p) => {
                  const isDismissed = dismissedMatches.has(p.email);
                  const rawAccess = getAccessStatus(p, teamMembers, allProfiles);
                  const access: AccessStatus =
                    isDismissed && rawAccess.status !== "none" && rawAccess.via === "suggested"
                      ? getDismissedFallback(p, teamMembers, allProfiles)
                      : rawAccess;
                  const isSuggested = rawAccess.status !== "none" && rawAccess.via === "suggested";

                  return (
                    <tr key={p.email}>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {p.first_name} {p.last_name}
                      </td>
                      <td className="px-4 py-2 text-muted-foreground hidden xl:table-cell">
                        {p.email}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <WaiverBadge status={p.waiver_status as WaiverStatus} />
                      </td>
                      <td className="sticky right-0 bg-card border-l px-3 py-2 max-w-[120px] sm:max-w-none overflow-x-auto">
                        {access.status === "on-team" && access.via === "exact" && (
                          <span className={`inline-flex items-center gap-1 ${colors.success}`}>
                            <Check className="h-4 w-4 shrink-0" />
                            <span className="text-xs">On team</span>
                          </span>
                        )}
                        {access.status === "on-team" && access.via === "suggested" && (
                          <Select
                            defaultValue="match"
                            onValueChange={(val) => {
                              if (val === "no-match")
                                setDismissedMatches((prev) => new Set(prev).add(p.email));
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 w-auto gap-1 text-xs ${statusColors.green.text} ${statusColors.green.border} ${statusColors.green.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}
                            >
                              <Check className="h-3 w-3 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="match">{access.match.email}</SelectItem>
                              <SelectItem value="no-match">Not the same person</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {access.status === "has-account" && access.via === "exact" && (
                          <span className={`inline-flex items-center gap-1 ${colors.warning}`}>
                            <UserCheck className="h-4 w-4" />
                            <span className="text-xs">Has account</span>
                          </span>
                        )}
                        {access.status === "has-account" && access.via === "suggested" && (
                          <Select
                            defaultValue="match"
                            onValueChange={(val) => {
                              if (val === "no-match")
                                setDismissedMatches((prev) => new Set(prev).add(p.email));
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 w-auto gap-1 text-xs ${statusColors.amber.text} ${statusColors.amber.border} ${statusColors.amber.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}
                            >
                              <UserCheck className="h-3 w-3 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="match">{access.match.email}</SelectItem>
                              <SelectItem value="no-match">Not the same person</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {access.status === "none" && (
                          <span className="inline-flex items-center gap-1.5">
                            <Badge
                              variant="outline"
                              className="text-xs text-muted-foreground border-border"
                            >
                              No account
                            </Badge>
                            {isDismissed && isSuggested && (
                              <button
                                type="button"
                                onClick={() =>
                                  setDismissedMatches((prev) => {
                                    const next = new Set(prev);
                                    next.delete(p.email);
                                    return next;
                                  })
                                }
                                className="text-xs text-info hover:text-info/80 hover:underline"
                              >
                                Undo
                              </button>
                            )}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={pending} className="rounded-full">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete All Synced Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete all CCSA synced data?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove all synced players from the database. Waiver badges
                  will no longer appear until you sync again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    setPending(true);
                    onError(null);
                    onSyncResult(null);
                    const result = await deleteAllCcsaPlayers();
                    if (result.error) {
                      onError(result.error);
                    } else {
                      onSyncResult("All synced data deleted");
                      await onRefresh();
                    }
                    setPending(false);
                  }}
                >
                  Delete All
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
