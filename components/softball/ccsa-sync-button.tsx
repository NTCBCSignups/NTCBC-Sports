"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, UserCheck, LogOut, Trash2, Check, Calendar, Users } from "lucide-react";
import { WaiverBadge } from "@/components/sports/badges";
import type { WaiverStatus } from "@/lib/supabase/types";
import { colors, statusColors, feedback } from "@/lib/styles";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  applyCcsaGameSync,
  cancelStaleCcsaGames,
} from "@/lib/softball/ccsa-sync";
import { getCcsaPlayersPreview, getCcsaGamesPreview } from "@/lib/softball/ccsa-preview";
import type { GamesPreview, PlayersPreview } from "@/lib/softball/ccsa-preview";
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
import type { PlayerPreviewEntry } from "@/lib/softball/ccsa-preview";

interface TeamMember {
  email: string;
  full_name: string;
}

interface ProfileEntry {
  email: string;
  full_name: string;
}

interface CcsaSyncButtonProps {
  hasSession: boolean;
  sessionEmail?: string;
  teamMembers?: TeamMember[];
  allProfiles?: ProfileEntry[];
  playersPreview?: PlayersPreview | null;
  gamesPreview?: GamesPreview | null;
  sessionTabs?: { value: string; label: string }[];
  defaultSessionType?: string;
}

type AccessStatus =
  | { status: "on-team"; via: "exact" | "suggested"; match: TeamMember }
  | { status: "has-account"; via: "exact" | "suggested"; match: ProfileEntry }
  | { status: "none" };

/** Fuzzy-match a CCSA player name against a list of profiles/members. */
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

/**
 * Determine access status for a CCSA player:
 * 1. Exact email on team → on-team (exact)
 * 2. Fuzzy name on team → on-team (suggested)
 * 3. Exact email has account → has-account (exact)
 * 4. Fuzzy name has account → has-account (suggested)
 * 5. Nothing → none
 */
function getAccessStatus(
  player: PlayerPreviewEntry,
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

export default function CcsaSyncButton({
  hasSession,
  sessionEmail,
  teamMembers = [],
  allProfiles = [],
  playersPreview: initialPlayersPreview = null,
  gamesPreview: initialGamesPreview = null,
  sessionTabs = [],
  defaultSessionType = "scheduled_game",
}: CcsaSyncButtonProps) {
  const [step, setStep] = useState<"idle" | "email" | "otp">("idle");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [loggedIn, setLoggedIn] = useState(hasSession);
  const [loggedInEmail, setLoggedInEmail] = useState(sessionEmail ?? "");
  const [playersPreview, setPlayersPreview] = useState<PlayersPreview | null>(
    initialPlayersPreview,
  );
  const [dismissedMatches, setDismissedMatches] = useState<Set<string>>(new Set());

  // Game sync state
  const [sessionType, setSessionType] = useState(defaultSessionType);
  const [gamesPreview, setGamesPreview] = useState<GamesPreview | null>(initialGamesPreview);
  const [gamesError, setGamesError] = useState<string | null>(null);
  const [gamesResult, setGamesResult] = useState<string | null>(null);
  const [selectedStale, setSelectedStale] = useState<Set<string>>(new Set());
  const [confirmedUpdates, setConfirmedUpdates] = useState<Set<string>>(new Set());

  // Auto-preview once when component mounts (if logged in)
  const hasSynced = useRef(false);

  /** Fetch read-only previews for players + games in parallel. No DB writes. */
  const handleSyncAll = async (sessionTypeOverride?: string) => {
    setPending(true);
    setError(null);
    setSyncResult(null);
    setGamesError(null);
    setGamesResult(null);

    const [pResult, gResult] = await Promise.all([
      getCcsaPlayersPreview(),
      getCcsaGamesPreview(sessionTypeOverride ?? sessionType),
    ]);

    // Handle players preview
    if ("error" in pResult) {
      setError(pResult.error);
      if (pResult.error.includes("session") || pResult.error.includes("expired")) {
        setLoggedIn(false);
      }
    } else {
      setPlayersPreview(pResult);
    }

    // Handle games preview
    if ("error" in gResult) {
      setGamesError(gResult.error);
      if (gResult.error.includes("session") || gResult.error.includes("expired")) {
        setLoggedIn(false);
      }
    } else {
      setGamesPreview(gResult);
      setSelectedStale(new Set());
      setConfirmedUpdates(new Set());
    }

    if (!("error" in pResult) && !("error" in gResult)) {
      setSyncResult("Synced just now");
    }

    setPending(false);
    hasSynced.current = true;
  };

  // Auto-preview on mount when logged in and not already fetched
  useEffect(() => {
    if (loggedIn && !hasSynced.current && !initialPlayersPreview && !initialGamesPreview) {
      handleSyncAll();
    } else if (initialPlayersPreview || initialGamesPreview) {
      // Server already eagerly loaded — mark as synced
      hasSynced.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync only on login state change, not on every render
  }, [loggedIn]);

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
      // Auto-sync will trigger via useEffect when loggedIn changes
    }
    setPending(false);
  };

  // ─── Game Sync Handlers ───────────────────────────────────────────────────

  const handleCancelStale = async () => {
    if (selectedStale.size === 0) return;
    setPending(true);
    setGamesError(null);
    const result = await cancelStaleCcsaGames(sessionType, Array.from(selectedStale));
    if (result.error) {
      setGamesError(result.error);
    } else {
      setGamesResult(`Cancelled ${result.count} stale game(s)`);
      if (gamesPreview) {
        setGamesPreview({
          ...gamesPreview,
          games: gamesPreview.games.filter(
            (g) => g.status !== "stale" || !selectedStale.has(g.staleSessionId!),
          ),
        });
      }
      setSelectedStale(new Set());
    }
    setPending(false);
  };

  const hasGameChanges =
    gamesPreview?.games.some((g) => g.status === "new" || g.status === "update" || g.status === "recreate");

  const hasPlayerChanges =
    playersPreview &&
    (playersPreview.newCount > 0 ||
      playersPreview.updatedCount > 0 ||
      playersPreview.players.some(
        (p) => getAccessStatus(p, teamMembers, allProfiles).status !== "on-team",
      ));

  return (
    <div className="space-y-4">
      {step === "idle" && (
        <div className="space-y-3">
          {loggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                CCSA logged in as <span className="font-medium">{loggedInEmail}</span>.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
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
                Log in to CCSA to pull the latest roster and game schedule.
              </p>
              <Button variant="outline" onClick={() => setStep("email")} className="rounded-full">
                Log in to CCSA
              </Button>
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

      {/* ─── Tabbed Content: Players / Games ─────────────────────────────── */}
      {loggedIn && step === "idle" && (
        <Tabs defaultValue="players" className="mt-4 gap-4">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="players">
                <Users className="h-3.5 w-3.5 mr-1.5" />
                Players
              </TabsTrigger>
              <TabsTrigger value="games">
                <Calendar className="h-3.5 w-3.5 mr-1.5" />
                Games
              </TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSyncAll()}
              disabled={pending}
              className="rounded-full"
            >
              <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${pending ? "animate-spin" : ""}`} />
              {pending ? "Syncing..." : "Refresh"}
            </Button>
          </div>

          {(syncResult || error) && (
            <div className="flex flex-wrap items-center gap-2">
              {syncResult && <p className={feedback.success}>{syncResult}</p>}
              {error && <p className={feedback.error}>{error}</p>}
            </div>
          )}

          <div className="border-t" />

          {/* ─── Players Tab ─────────────────────────────────────────────── */}
          <TabsContent value="players" className="space-y-3">
            <div className="flex items-center gap-2">
              {hasPlayerChanges && (
                <Button
                  size="sm"
                  onClick={async () => {
                    setPending(true);
                    setError(null);
                    const result = await syncCcsaWaivers();
                    if (result.error) {
                      setError(result.error);
                    } else {
                      const approveResult = await approveCcsaPlayersForTeam();
                      if (approveResult.error) {
                        setError(approveResult.error);
                      } else {
                        setSyncResult(
                          `Applied ${result.count} players${approveResult.count ? `, approved ${approveResult.count} for team` : ""}`,
                        );
                      }
                      await handleSyncAll();
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
                          isDismissed &&
                          rawAccess.status !== "none" &&
                          rawAccess.via === "suggested"
                            ? getDismissedFallback(p, teamMembers, allProfiles)
                            : rawAccess;

                        const isSuggested =
                          rawAccess.status !== "none" && rawAccess.via === "suggested";

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
                                <span
                                  className={`inline-flex items-center gap-1 ${colors.success}`}
                                >
                                  <Check className="h-4 w-4 shrink-0" />
                                  <span className="text-xs">On team</span>
                                </span>
                              )}

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
                                    <SelectItem value="match">{access.match.email}</SelectItem>
                                    <SelectItem value="no-match">Not the same person</SelectItem>
                                  </SelectContent>
                                </Select>
                              )}

                              {access.status === "has-account" && access.via === "exact" && (
                                <span
                                  className={`inline-flex items-center gap-1 ${colors.warning}`}
                                >
                                  <UserCheck className="h-4 w-4" />
                                  <span className="text-xs">Has account</span>
                                </span>
                              )}

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
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={pending}
                      className="rounded-full"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete All Synced Data
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete all CCSA synced data?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove all synced players from the database. Waiver
                        badges will no longer appear until you sync again.
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
                            setPlayersPreview(null);
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
          </TabsContent>

          {/* ─── Games Tab ────────────────────────────────────────────────── */}
          <TabsContent value="games" className="space-y-3">
            <div className="flex items-center gap-2">
              {sessionTabs.length > 1 && (
                <>
                  <span className="text-xs text-muted-foreground">Sync to:</span>
                  <Select
                    value={sessionType}
                    onValueChange={async (val) => {
                      setSessionType(val);
                      setGamesPreview(null);
                      setGamesError(null);
                      setGamesResult(null);
                      setPending(true);
                      const gResult = await getCcsaGamesPreview(val);
                      if ("error" in gResult) {
                        setGamesError(gResult.error);
                      } else {
                        setGamesPreview(gResult);
                        setSelectedStale(new Set());
                        setConfirmedUpdates(new Set());
                      }
                      setPending(false);
                    }}
                  >
                    <SelectTrigger className="h-7 w-auto text-base md:text-xs px-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessionTabs.map((tab) => (
                        <SelectItem key={tab.value} value={tab.value}>
                          {tab.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </>
              )}
              {hasGameChanges && (
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!gamesPreview) return;
                    setPending(true);
                    setGamesError(null);
                    setGamesResult(null);
                    // Filter: apply all new/recreate, and only confirmed updates
                    const toApply = gamesPreview.games.filter((g) => {
                      if (g.status === "new" || g.status === "recreate") return true;
                      if (g.status === "update") {
                        return !g.needsConfirmation || confirmedUpdates.has(g.gamecode);
                      }
                      return false;
                    });
                    const result = await applyCcsaGameSync(sessionType, toApply);
                    if (result.errors.length > 0) setGamesError(result.errors.join("; "));
                    const parts: string[] = [];
                    if (result.created > 0) parts.push(`${result.created} created`);
                    if (result.updated > 0) parts.push(`${result.updated} updated`);
                    if (parts.length > 0) setGamesResult(parts.join(", "));
                    await handleSyncAll();
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

            {(gamesResult || gamesError) && (
              <div className="flex flex-wrap items-center gap-2">
                {gamesResult && <p className={feedback.success}>{gamesResult}</p>}
                {gamesError && <p className={feedback.error}>{gamesError}</p>}
              </div>
            )}

            {gamesPreview && (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  {gamesPreview.teamName} · Schedule updated: {gamesPreview.lastupdate} ·{" "}
                  {gamesPreview.games.length} games
                </p>

                <div className="rounded-lg border overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-left text-xs text-muted-foreground uppercase">
                      <tr>
                        <th className="px-4 py-2">Game</th>
                        <th className="px-4 py-2">Date & Time</th>
                        <th className="px-4 py-2 hidden md:table-cell">Location</th>
                        <th className="sticky right-0 bg-muted px-4 py-2 border-l">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {gamesPreview.games.map((row) => (
                        <tr key={row.gamecode} className={row.status === "past" ? "opacity-50" : undefined}>
                          <td className="px-4 py-2 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {row.status === "stale" && row.staleSessionId && (
                                <input
                                  type="checkbox"
                                  checked={selectedStale.has(row.staleSessionId)}
                                  onChange={(e) => {
                                    const sid = row.staleSessionId!;
                                    setSelectedStale((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(sid);
                                      else next.delete(sid);
                                      return next;
                                    });
                                  }}
                                  className="rounded"
                                />
                              )}
                              {row.status === "update" && row.needsConfirmation && (
                                <input
                                  type="checkbox"
                                  checked={confirmedUpdates.has(row.gamecode)}
                                  onChange={(e) => {
                                    setConfirmedUpdates((prev) => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(row.gamecode);
                                      else next.delete(row.gamecode);
                                      return next;
                                    });
                                  }}
                                  className="rounded"
                                />
                              )}
                              {row.title}
                            </div>
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap">
                            {row.status === "update" && row.oldDate ? (
                              <>
                                <div className="text-muted-foreground line-through text-xs">
                                  {row.oldDate} {row.oldTime}
                                </div>
                                <div className={`text-xs ${colors.success}`}>
                                  {row.date} {row.time}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground">{row.date} {row.time}</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-muted-foreground hidden md:table-cell">
                            {row.status === "update" && row.oldLocation ? (
                              <>
                                <div className="line-through text-xs">{row.oldLocation}</div>
                                <div className={`text-xs ${colors.success}`}>{row.location}</div>
                              </>
                            ) : (
                              row.location || "—"
                            )}
                          </td>
                          <td className="sticky right-0 bg-card border-l px-4 py-2">
                            {row.status === "synced" && (
                              <span className={`inline-flex items-center gap-1 ${colors.success}`}>
                                <Check className="h-3.5 w-3.5" />
                                <span className="text-xs">Synced</span>
                              </span>
                            )}
                            {row.status === "new" && (
                              <Badge className={`${statusColors.green.bg} ${statusColors.green.text} ${statusColors.green.border}`}>
                                New
                              </Badge>
                            )}
                            {row.status === "update" && (
                              <Badge className={`${statusColors.amber.bg} ${statusColors.amber.text} ${statusColors.amber.border}`}>
                                {row.needsConfirmation ? "Confirm?" : "Rescheduled"}
                              </Badge>
                            )}
                            {row.status === "recreate" && (
                              <Badge className={`${statusColors.info.bg} ${statusColors.info.text} ${statusColors.info.border}`}>
                                Recreate
                              </Badge>
                            )}
                            {row.status === "stale" && (
                              <Badge variant="destructive">Stale</Badge>
                            )}
                            {row.status === "past" && (
                              <span className="text-xs text-muted-foreground">Played</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {gamesPreview.games.some((g) => g.status === "stale") && selectedStale.size > 0 && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleCancelStale}
                    disabled={pending}
                    className="rounded-full"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Cancel {selectedStale.size} Stale Game{selectedStale.size > 1 ? "s" : ""}
                  </Button>
                )}
              </div>
            )}

            {!gamesPreview && !gamesError && pending && (
              <p className="text-xs text-muted-foreground">Syncing game schedule...</p>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
