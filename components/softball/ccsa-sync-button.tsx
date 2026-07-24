"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, LogOut, Calendar, Users } from "lucide-react";
import { feedback } from "@/lib/styles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requestCcsaLogin, completeCcsaLogin, logoutCcsa } from "@/lib/softball/ccsa-sync";
import { getCcsaPlayersPreview, getCcsaGamesPreview } from "@/lib/softball/ccsa-preview";
import type { GamesPreview, PlayersPreview } from "@/lib/softball/ccsa-preview";
import CcsaPlayersTab from "@/components/softball/ccsa-players-tab";
import CcsaGamesTab from "@/components/softball/ccsa-games-tab";

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
  const [gamesPreview, setGamesPreview] = useState<GamesPreview | null>(initialGamesPreview);

  const hasSynced = useRef(false);

  const handleSyncAll = async (sessionTypeOverride?: string) => {
    setPending(true);
    setError(null);
    setSyncResult(null);

    const [pResult, gResult] = await Promise.all([
      getCcsaPlayersPreview(),
      getCcsaGamesPreview(sessionTypeOverride ?? defaultSessionType),
    ]);

    if ("error" in pResult) {
      setError(pResult.error);
      if (pResult.error.includes("session") || pResult.error.includes("expired")) {
        setLoggedIn(false);
      }
    } else {
      setPlayersPreview(pResult);
    }

    if ("error" in gResult) {
      if (!("error" in pResult)) setError(gResult.error);
      if (gResult.error.includes("session") || gResult.error.includes("expired")) {
        setLoggedIn(false);
      }
    } else {
      setGamesPreview(gResult);
    }

    if (!("error" in pResult) && !("error" in gResult)) {
      setSyncResult("Synced just now");
    }

    setPending(false);
    hasSynced.current = true;
  };

  useEffect(() => {
    if (loggedIn && !hasSynced.current && !initialPlayersPreview && !initialGamesPreview) {
      handleSyncAll();
    } else if (initialPlayersPreview || initialGamesPreview) {
      hasSynced.current = true;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally sync only on login state change
  }, [loggedIn]);

  // ─── Auth handlers ────────────────────────────────────────────────────────

  const handleSendCode = async () => {
    setPending(true);
    setError(null);
    const result = await requestCcsaLogin(email);
    if (result.error) setError(result.error);
    else setStep("otp");
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

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {step === "idle" && (
        <div className="space-y-3">
          {loggedIn ? (
            <>
              <p className="text-sm text-muted-foreground">
                CCSA logged in as <span className="font-medium">{loggedInEmail}</span>.
              </p>
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

          <TabsContent value="players">
            <CcsaPlayersTab
              playersPreview={playersPreview}
              teamMembers={teamMembers}
              allProfiles={allProfiles}
              pending={pending}
              setPending={setPending}
              onSyncResult={setSyncResult}
              onError={setError}
              onRefresh={handleSyncAll}
            />
          </TabsContent>

          <TabsContent value="games">
            <CcsaGamesTab
              gamesPreview={gamesPreview}
              setGamesPreview={setGamesPreview}
              sessionTabs={sessionTabs}
              defaultSessionType={defaultSessionType}
              pending={pending}
              setPending={setPending}
              onRefresh={handleSyncAll}
            />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
