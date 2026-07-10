"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, UserCheck, LogOut, Trash2, Check } from "lucide-react";
import { WaiverBadge } from "@/components/sports/badges";
import { formatTimestamp } from "@/lib/format";
import type { WaiverStatus } from "@/lib/supabase/types";
import { colors, statusColors, feedback } from "@/lib/styles";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  requestCcsaLogin,
  completeCcsaLogin,
  syncCcsaWaivers,
  logoutCcsa,
  approveCcsaPlayersForTeam,
  deleteAllCcsaPlayers,
  getCcsaGamesPreview,
  applyCcsaGameSync,
  cancelStaleCcsaGames,
} from "@/lib/softball/ccsa-sync";
import type { GamesPreview } from "@/lib/softball/ccsa-sync";
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

interface SyncedPlayer {
  email: string;
  first_name: string;
  last_name: string;
  waiver_status: string;
}

interface TeamMember {
  email: string;
  full_name: string;
}

interface ProfileEntry {
  email: string;
  full_name: string;
}

interface CcsaSyncButtonProps {
  lastSyncedAt: string | null;
  hasSession: boolean;
  sessionEmail?: string;
  initialPlayers?: SyncedPlayer[];
  teamMembers?: TeamMember[];
  allProfiles?: ProfileEntry[];
  gamesPreview?: GamesPreview | null;
}

type AccessStatus =
  | { status: "on-team"; via: "exact" | "suggested"; match: TeamMember }
  | { status: "has-account"; via: "exact" | "suggested"; match: ProfileEntry }
  | { status: "none" };

/** Fuzzy-match a CCSA player name against a list of profiles/members. */
function fuzzyNameMatch<T extends { full_name: string }>(
  player: SyncedPlayer,
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

/**
 * Determine access status for a CCSA player:
 * 1. Exact email on team → on-team (exact)
 * 2. Fuzzy name on team → on-team (suggested)
 * 3. Exact email has account → has-account (exact)
 * 4. Fuzzy name has account → has-account (suggested)
 * 5. Nothing → none
 */
function getAccessStatus(
  player: SyncedPlayer,
  teamMembers: TeamMember[],
  allProfiles: ProfileEntry[],
): AccessStatus {
  // Check team members first (email then name)
  const teamEmail = teamMembers.find((m) => m.email.toLowerCase() === player.email.toLowerCase());
  if (teamEmail) return { status: "on-team", via: "exact", match: teamEmail };

  const teamName = fuzzyNameMatch(player, teamMembers);
  if (teamName) return { status: "on-team", via: "suggested", match: teamName };

  // Check all profiles (email then name)
  const profileEmail = allProfiles.find(
    (p) => p.email.toLowerCase() === player.email.toLowerCase(),
  );
  if (profileEmail) return { status: "has-account", via: "exact", match: profileEmail };

  const profileName = fuzzyNameMatch(player, allProfiles);
  if (profileName) return { status: "has-account", via: "suggested", match: profileName };

  return { status: "none" };
}

/**
 * When a suggested match is dismissed, fall back to exact-email-only matching.
 */
function getDismissedFallback(
  player: SyncedPlayer,
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

export default function CcsaSyncButton({
  lastSyncedAt,
  hasSession,
  sessionEmail,
  initialPlayers = [],
  teamMembers = [],
  allProfiles = [],
  gamesPreview: initialGamesPreview = null,
}: CcsaSyncButtonProps) {
  const [step, setStep] = useState<"idle" | "email" | "otp">("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [approveResult, setApproveResult] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(hasSession);
  const [loggedInEmail, setLoggedInEmail] = useState(sessionEmail ?? "");
  const [players, setPlayers] = useState<SyncedPlayer[]>(initialPlayers);
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set());

  // Game sync state
  const [gamesPreview, setGamesPreview] = useState<GamesPreview | null>(initialGamesPreview);
  const [gamesPending, setGamesPending] = useState(false);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesResult, setGamesResult] = useState<string | null>(null);
  const [selectedStale, setSelectedStale] = useState<Set<string>>(new Set());

  const handleQuickSync = async () => {
    setPending(true);
    setError(null);
    setSyncResult(null);
    const result = await syncCcsaWaivers();
    if (result.players) setPlayers(result.players);
    if (result.error) {
      setError(result.error);
      // Session expired — show login flow
      if (
        result.error.includes("session") ||
        result.error.includes("expired") ||
        result.error.includes("log in")
      ) {
        setLoggedIn(false);
      }
    }
    if (result.count) {
      setSyncResult(`Synced ${result.count} players`);
    }
    setPending(false);
  };

  const handleSendCode = async () => {
    setPending(true);
    setError(null);
    const result = await requestCcsaLogin(email);
    if (result.error) {
      setError(result.error);
    } else {
      setStep("otp");
    }
    setPending(false);
  };

  const handleVerifyLogin = async () => {
    setPending(true);
    setError(null);
    const result = await completeCcsaLogin(email, otp);
    if (result.error) {
      setError(result.error);
    } else {
      setLoggedIn(true);
      setLoggedInEmail(email);
      setStep("idle");
    }
    setPending(false);
  };

  const handleApproveAll = async () => {
    setPending(true);
    setError(null);
    setApproveResult(null);
    const result = await approveCcsaPlayersForTeam();
    if (result.error) {
      setError(result.error);
    } else {
      setApproveResult(`Approved ${result.count} players for team access`);
    }
    setPending(false);
  };

  // ─── Game Sync Handlers ───────────────────────────────────────────────────

  const handleRefreshGamesPreview = async () => {
    setGamesPending(true);
    setGamesError(null);
    setGamesResult(null);
    const result = await getCcsaGamesPreview();
    if ("error" in result) {
      setGamesError(result.error);
      if (result.error.includes("session") || result.error.includes("expired")) {
        setLoggedIn(false);
      }
    } else {
      setGamesPreview(result);
      setSelectedStale(new Set());
    }
    setGamesPending(false);
  };

  const handleApplyGameSync = async () => {
    if (!gamesPreview) return;
    setGamesPending(true);
    setGamesError(null);
    setGamesResult(null);

    const result = await applyCcsaGameSync(
      gamesPreview.newGames,
      gamesPreview.updated,
      gamesPreview.skipped,
    );

    if (result.errors.length > 0) {
      setGamesError(result.errors.join("; "));
    }

    const parts: string[] = [];
    if (result.created > 0) parts.push(`${result.created} created`);
    if (result.updated > 0) parts.push(`${result.updated} updated`);
    if (parts.length > 0) setGamesResult(parts.join(", "));

    // Refresh preview to reflect new state
    const refreshed = await getCcsaGamesPreview();
    if (!("error" in refreshed)) {
      setGamesPreview(refreshed);
      setSelectedStale(new Set());
    }
    setGamesPending(false);
  };

  const handleCancelStale = async () => {
    if (selectedStale.size === 0) return;
    setGamesPending(true);
    setGamesError(null);
    const result = await cancelStaleCcsaGames(Array.from(selectedStale));
    if (result.error) {
      setGamesError(result.error);
    } else {
      setGamesResult(`Cancelled ${result.count} stale game(s)`);
      // Remove cancelled from preview
      if (gamesPreview) {
        setGamesPreview({
          ...gamesPreview,
          stale: gamesPreview.stale.filter((s) => !selectedStale.has(s.sessionId)),
        });
      }
      setSelectedStale(new Set());
    }
    setGamesPending(false);
  };

  const hasGameChanges =
    gamesPreview && (gamesPreview.newGames.length > 0 || gamesPreview.updated.length > 0 || gamesPreview.skipped.length > 0);

  return (
    <div className="space-y-4">
      {lastSyncedAt && (
        <p className="text-xs text-muted-foreground">
          Last synced: {formatTimestamp(lastSyncedAt)}
        </p>
      )}

      {step === "idle" && (
        <div className="space-y-3">
          {loggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                CCSA logged in as <span className="font-medium">{loggedInEmail}</span>. Sync to pull
                the latest roster and waiver data.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button onClick={handleQuickSync} disabled={pending} className="rounded-full">
                  <RefreshCw className={`h-4 w-4 mr-2 ${pending ? "animate-spin" : ""}`} />
                  {pending ? "Syncing..." : "Sync"}
                </Button>
                {players.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleApproveAll}
                    disabled={pending}
                    className="rounded-full"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {pending ? "Approving..." : "Approve All for Team Access"}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={async () => {
                    await logoutCcsa();
                    setLoggedIn(false);
                    setLoggedInEmail("");
                  }}
                  disabled={pending}
                  className="rounded-full text-muted-foreground"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout from CCSA
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Log in to CCSA to pull the latest roster and waiver data.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => setStep("email")} className="rounded-full">
                  Log in to CCSA
                </Button>
                {players.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={handleApproveAll}
                    disabled={pending}
                    className="rounded-full"
                  >
                    <UserCheck className="h-4 w-4 mr-2" />
                    {pending ? "Approving..." : "Approve All for Team Access"}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {step === "email" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter your CCSA email to receive a login code.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ccsa-email">CCSA Email</Label>
            <Input
              id="ccsa-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleSendCode} disabled={pending || !email} className="rounded-full">
              {pending ? "Sending..." : "Send Code"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("idle")}
              disabled={pending}
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            A login code was sent to <span className="font-medium">{email}</span>.
          </p>
          <div className="space-y-2">
            <Label htmlFor="ccsa-otp">Login Code</Label>
            <Input
              id="ccsa-otp"
              type="text"
              placeholder="Enter code from email"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button onClick={handleVerifyLogin} disabled={pending || !otp} className="rounded-full">
              {pending ? "Logging in..." : "Login"}
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep("email")}
              disabled={pending}
              className="rounded-full"
            >
              Back
            </Button>
          </div>
        </div>
      )}

      {(syncResult || error) && (
        <div className="flex flex-wrap items-center gap-2">
          {syncResult && <p className={feedback.success}>{syncResult}</p>}
          {error && <p className={feedback.error}>{error}</p>}
        </div>
      )}
      {approveResult && <p className={feedback.success}>{approveResult}</p>}

      {players.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-lg border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-2">Name</th>
                  <th className="px-4 py-2 hidden xl:table-cell">CCSA Email</th>
                  <th className="px-4 py-2">Waiver</th>
                  <th className="px-4 py-2">Team Access</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {players.map((p) => {
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
                      <td className="px-4 py-2">
                        {/* On team — exact email */}
                        {access.status === "on-team" && access.via === "exact" && (
                          <span className={`inline-flex items-center gap-1 ${colors.success}`}>
                            <Check className="h-4 w-4 shrink-0" />
                            <span className="text-xs">On team</span>
                          </span>
                        )}

                        {/* On team — suggested name match (dropdown to dismiss) */}
                        {access.status === "on-team" && access.via === "suggested" && (
                          <Select
                            defaultValue="match"
                            onValueChange={(val) => {
                              if (val === "no-match") {
                                setDismissedMatches((prev) => new Set(prev).add(p.email));
                              }
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 w-auto gap-1 text-xs ${statusColors.green.text} ${statusColors.green.border} ${statusColors.green.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}
                            >
                              <Check className="h-3 w-3 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="match">
                                Likely {access.match.full_name} ({access.match.email})
                              </SelectItem>
                              <SelectItem value="no-match">Not the same person</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {/* Has account — exact email, not on team */}
                        {access.status === "has-account" && access.via === "exact" && (
                          <span className={`inline-flex items-center gap-1 ${colors.warning}`}>
                            <UserCheck className="h-4 w-4" />
                            <span className="text-xs">Has account</span>
                          </span>
                        )}

                        {/* Has account — suggested name match (dropdown to dismiss) */}
                        {access.status === "has-account" && access.via === "suggested" && (
                          <Select
                            defaultValue="match"
                            onValueChange={(val) => {
                              if (val === "no-match") {
                                setDismissedMatches((prev) => new Set(prev).add(p.email));
                              }
                            }}
                          >
                            <SelectTrigger
                              className={`h-7 w-auto gap-1 text-xs ${statusColors.amber.text} ${statusColors.amber.border} ${statusColors.amber.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}
                            >
                              <UserCheck className="h-3 w-3 shrink-0" />
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="match">
                                Likely {access.match.full_name} ({access.match.email})
                              </SelectItem>
                              <SelectItem value="no-match">Not the same person</SelectItem>
                            </SelectContent>
                          </Select>
                        )}

                        {/* No match — with undo if was dismissed */}
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
                  This will permanently remove all {players.length} synced players from the
                  database. Waiver badges will no longer appear until you sync again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700"
                  onClick={async () => {
                    setPending(true);
                    setError(null);
                    setSyncResult(null);
                    const result = await deleteAllCcsaPlayers();
                    if (result.error) {
                      setError(result.error);
                    } else {
                      setPlayers([]);
                      setSyncResult("All synced data deleted");
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

      {/* ─── Game Schedule Sync ───────────────────────────────────────────── */}
      {loggedIn && (
        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Game Schedule</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshGamesPreview}
              disabled={gamesPending}
              className="rounded-full"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${gamesPending ? "animate-spin" : ""}`} />
              {gamesPending ? "Loading..." : "Refresh"}
            </Button>
          </div>

          {gamesError && <p className={feedback.error}>{gamesError}</p>}
          {gamesResult && <p className={feedback.success}>{gamesResult}</p>}

          {gamesPreview && (
            <div className="space-y-3">
              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 text-xs">
                {gamesPreview.newGames.length > 0 && (
                  <Badge className={`${statusColors.green.bg} ${statusColors.green.text} ${statusColors.green.border}`}>
                    {gamesPreview.newGames.length} new
                  </Badge>
                )}
                {gamesPreview.updated.length > 0 && (
                  <Badge className={`${statusColors.amber.bg} ${statusColors.amber.text} ${statusColors.amber.border}`}>
                    {gamesPreview.updated.length} rescheduled
                  </Badge>
                )}
                {gamesPreview.stale.length > 0 && (
                  <Badge variant="destructive">
                    {gamesPreview.stale.length} stale
                  </Badge>
                )}
                {gamesPreview.skipped.length > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {gamesPreview.skipped.length} skipped (cancelled)
                  </Badge>
                )}
                {gamesPreview.unchanged > 0 && (
                  <Badge variant="outline" className="text-muted-foreground">
                    {gamesPreview.unchanged} unchanged
                  </Badge>
                )}
              </div>

              <p className="text-xs text-muted-foreground">
                CCSA schedule last updated: {gamesPreview.lastupdate} · Team: {gamesPreview.teamName}
              </p>

              {/* New games */}
              {gamesPreview.newGames.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">
                    New games ({gamesPreview.newGames.length})
                  </summary>
                  <ul className="mt-1 space-y-1 pl-4 text-xs text-muted-foreground">
                    {gamesPreview.newGames.map((g) => (
                      <li key={g.gamecode}>
                        {g.date} {g.time} — {g.title} @ {g.location}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Rescheduled games */}
              {gamesPreview.updated.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-foreground">
                    Rescheduled games ({gamesPreview.updated.length})
                  </summary>
                  <ul className="mt-1 space-y-2 pl-4 text-xs">
                    {gamesPreview.updated.map((g) => (
                      <li key={g.gamecode}>
                        <span className="font-medium text-foreground">{g.title}</span>
                        <div className="text-muted-foreground line-through">
                          {g.oldDate} {g.oldTime} @ {g.oldLocation}
                        </div>
                        <div className={colors.success}>
                          {g.newDate} {g.newTime} @ {g.newLocation}
                        </div>
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Skipped (cancelled on our side) */}
              {gamesPreview.skipped.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer font-medium text-muted-foreground">
                    Skipped — cancelled on our side ({gamesPreview.skipped.length})
                  </summary>
                  <p className="mt-1 pl-4 text-xs text-muted-foreground">
                    These games are cancelled in our system. New sessions will be created for them.
                  </p>
                  <ul className="mt-1 space-y-1 pl-4 text-xs text-muted-foreground">
                    {gamesPreview.skipped.map((g) => (
                      <li key={g.gamecode}>
                        {g.date} {g.time} — {g.title} @ {g.location}
                      </li>
                    ))}
                  </ul>
                </details>
              )}

              {/* Stale games */}
              {gamesPreview.stale.length > 0 && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
                  <p className="text-sm font-medium text-destructive">
                    ⚠ Stale games (not in CCSA schedule)
                  </p>
                  <ul className="space-y-1 text-xs">
                    {gamesPreview.stale.map((g) => (
                      <li key={g.sessionId} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedStale.has(g.sessionId)}
                          onChange={(e) => {
                            setSelectedStale((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(g.sessionId);
                              else next.delete(g.sessionId);
                              return next;
                            });
                          }}
                          className="rounded"
                        />
                        <span className="text-foreground">
                          {g.title ?? g.gamecode} — {g.date}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelStale}
                    disabled={gamesPending || selectedStale.size === 0}
                    className="rounded-full"
                  >
                    Cancel {selectedStale.size} Selected
                  </Button>
                </div>
              )}

              {/* Apply button */}
              {hasGameChanges && (
                <Button
                  onClick={handleApplyGameSync}
                  disabled={gamesPending}
                  className="rounded-full"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${gamesPending ? "animate-spin" : ""}`} />
                  {gamesPending ? "Applying..." : "Apply Game Sync"}
                </Button>
              )}
            </div>
          )}

          {!gamesPreview && !gamesError && (
            <p className="text-xs text-muted-foreground">
              Click Refresh to load the CCSA game schedule.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
