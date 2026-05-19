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
        const mFirst = parts[0];
        const mLast = parts[parts.length - 1];

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
    const teamEmail = teamMembers.find(
        (m) => m.email.toLowerCase() === player.email.toLowerCase(),
    );
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
}: CcsaSyncButtonProps) {
    const [step, setStep] = useState<"idle" | "email" | "otp">(
        "idle",
    );
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

    const handleQuickSync = async () => {
        setPending(true);
        setError(null);
        setSyncResult(null);
        const result = await syncCcsaWaivers();
        if (result.players) setPlayers(result.players);
        if (result.error) {
            setError(result.error);
            // Session expired — show login flow
            if (result.error.includes("session") || result.error.includes("expired") || result.error.includes("log in")) {
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

    return (
        <div className="space-y-4">
            {lastSyncedAt && (
                <p className="text-xs text-muted-foreground">
                    Last synced:{" "}
                    {formatTimestamp(lastSyncedAt)}
                </p>
            )}

            {step === "idle" && (
                <div className="space-y-3">
                    {loggedIn ? (
                        <>
                            <p className="text-sm text-muted-foreground">
                                CCSA logged in as <span className="font-medium">{loggedInEmail}</span>. Sync to pull the latest roster and waiver data.
                            </p>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    onClick={handleQuickSync}
                                    disabled={pending}
                                    className="rounded-full"
                                >
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
                                <Button
                                    variant="outline"
                                    onClick={() => setStep("email")}
                                    className="rounded-full"
                                >
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
                        <Button
                            onClick={handleSendCode}
                            disabled={pending || !email}
                            className="rounded-full"
                        >
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
                        <Button
                            onClick={handleVerifyLogin}
                            disabled={pending || !otp}
                            className="rounded-full"
                        >
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
                                    const access: AccessStatus = isDismissed && rawAccess.status !== "none" && rawAccess.via === "suggested"
                                        ? getDismissedFallback(p, teamMembers, allProfiles)
                                        : rawAccess;

                                    const isSuggested = rawAccess.status !== "none" && rawAccess.via === "suggested";

                                    return (
                                        <tr key={p.email}>
                                            <td className="px-4 py-2 whitespace-nowrap">{p.first_name} {p.last_name}</td>
                                            <td className="px-4 py-2 text-muted-foreground hidden xl:table-cell">{p.email}</td>
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
                                                        <SelectTrigger className={`h-7 w-auto gap-1 text-xs ${statusColors.green.text} ${statusColors.green.border} ${statusColors.green.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}>
                                                            <Check className="h-3 w-3 shrink-0" />
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="match">
                                                                Likely {access.match.full_name} ({access.match.email})
                                                            </SelectItem>
                                                            <SelectItem value="no-match">
                                                                Not the same person
                                                            </SelectItem>
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
                                                        <SelectTrigger className={`h-7 w-auto gap-1 text-xs ${statusColors.amber.text} ${statusColors.amber.border} ${statusColors.amber.bg} px-2 [&>svg]:h-3 [&>svg]:w-3`}>
                                                            <UserCheck className="h-3 w-3 shrink-0" />
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="match">
                                                                Likely {access.match.full_name} ({access.match.email})
                                                            </SelectItem>
                                                            <SelectItem value="no-match">
                                                                Not the same person
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )}

                                                {/* No match — with undo if was dismissed */}
                                                {access.status === "none" && (
                                                    <span className="inline-flex items-center gap-1.5">
                                                        <Badge variant="outline" className="text-xs text-muted-foreground border-border">
                                                            No account
                                                        </Badge>
                                                        {isDismissed && isSuggested && (
                                                            <button
                                                                type="button"
                                                                onClick={() => setDismissedMatches((prev) => {
                                                                    const next = new Set(prev);
                                                                    next.delete(p.email);
                                                                    return next;
                                                                })}
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
                                    This will permanently remove all {players.length} synced players from the database.
                                    Waiver badges will no longer appear until you sync again.
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
        </div>
    );
}
