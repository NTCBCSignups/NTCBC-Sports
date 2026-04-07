"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, UserCheck, ShieldCheck, ShieldAlert, LogOut, Trash2 } from "lucide-react";
import {
    requestCcsaLogin,
    completeCcsaLogin,
    syncCcsaWaivers,
    logoutCcsa,
    approveCcsaPlayersForTeam,
    deleteAllCcsaPlayers,
} from "@/app/softball/actions/ccsa-sync";
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

interface CcsaSyncButtonProps {
    lastSyncedAt: string | null;
    hasSession: boolean;
    sessionEmail?: string;
    initialPlayers?: SyncedPlayer[];
}

export default function CcsaSyncButton({ lastSyncedAt, hasSession, sessionEmail, initialPlayers = [] }: CcsaSyncButtonProps) {
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
                    {new Date(lastSyncedAt).toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                    })}
                </p>
            )}

            {step === "idle" && (
                <div className="space-y-3">
                    {loggedIn ? (
                        <>
                            <p className="text-sm text-gray-600">
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
                                <Button
                                    variant="outline"
                                    onClick={handleApproveAll}
                                    disabled={pending}
                                    className="rounded-full"
                                >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    {pending ? "Approving..." : "Approve All for Team Access"}
                                </Button>
                                <Button
                                    variant="ghost"
                                    onClick={async () => {
                                        await logoutCcsa();
                                        setLoggedIn(false);
                                        setLoggedInEmail("");
                                    }}
                                    disabled={pending}
                                    className="rounded-full text-gray-500"
                                >
                                    <LogOut className="h-4 w-4 mr-2" />
                                    Logout from CCSA
                                </Button>
                            </div>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-gray-600">
                                Log in to CCSA to pull the latest roster and waiver data.
                            </p>
                            <Button
                                variant="outline"
                                onClick={() => setStep("email")}
                                className="rounded-full"
                            >
                                Log in to CCSA
                            </Button>
                        </>
                    )}
                </div>
            )}

            {step === "email" && (
                <div className="space-y-3">
                    <p className="text-sm text-gray-600">
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
                    <p className="text-sm text-gray-600">
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
                    {syncResult && <p className="text-sm text-green-600 font-medium">{syncResult}</p>}
                    {error && <p className="text-sm text-red-600">{error}</p>}
                </div>
            )}
            {approveResult && <p className="text-sm text-green-600 font-medium">{approveResult}</p>}

            {players.length > 0 && (
                <div className="space-y-3">
                <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                            <tr>
                                <th className="px-4 py-2">Name</th>
                                <th className="px-4 py-2">Email</th>
                                <th className="px-4 py-2">Waiver</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {players.map((p) => (
                                <tr key={p.email}>
                                    <td className="px-4 py-2">{p.first_name} {p.last_name}</td>
                                    <td className="px-4 py-2 text-gray-500">{p.email}</td>
                                    <td className="px-4 py-2">
                                        {p.waiver_status === "valid" ? (
                                            <span className="inline-flex items-center gap-1 text-green-600">
                                                <ShieldCheck className="h-4 w-4" /> Valid
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1 text-amber-600">
                                                <ShieldAlert className="h-4 w-4" />
                                                {p.waiver_status === "needs_paper" ? "Needs Paper" : "Needs Online"}
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
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
