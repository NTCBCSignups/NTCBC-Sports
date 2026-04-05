"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RefreshCw, UserCheck } from "lucide-react";
import {
  requestCcsaLogin,
  loginAndSyncCcsaWaivers,
  approveCcsaPlayersForTeam,
} from "@/app/softball/actions/ccsa-sync";

interface CcsaSyncButtonProps {
  lastSyncedAt: string | null;
}

export default function CcsaSyncButton({ lastSyncedAt }: CcsaSyncButtonProps) {
  const [step, setStep] = useState<"email" | "otp" | "done">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [approveResult, setApproveResult] = useState<string | null>(null);

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

  const handleVerifyAndSync = async () => {
    setPending(true);
    setError(null);
    const result = await loginAndSyncCcsaWaivers(email, otp);
    if (result.error) {
      setError(result.error);
    } else {
      setSyncResult(`Synced ${result.count} players`);
      setStep("done");
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

  const handleReset = () => {
    setStep("email");
    setOtp("");
    setError(null);
    setSyncResult(null);
    setApproveResult(null);
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

      {step === "email" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            Enter your CCSA email to pull the latest roster and waiver data.
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
          <Button
            onClick={handleSendCode}
            disabled={pending || !email}
            className="rounded-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${pending ? "animate-spin" : ""}`} />
            {pending ? "Sending..." : "Send Code"}
          </Button>
        </div>
      )}

      {step === "otp" && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">
            A login code was sent to <span className="font-medium">{email}</span>.
            Enter it below to sync waiver data.
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
              onClick={handleVerifyAndSync}
              disabled={pending || !otp}
              className="rounded-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${pending ? "animate-spin" : ""}`} />
              {pending ? "Syncing..." : "Verify & Sync"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={pending}
              className="rounded-full"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === "done" && (
        <div className="space-y-3">
          {syncResult && (
            <p className="text-sm text-green-600 font-medium">{syncResult}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              onClick={handleApproveAll}
              disabled={pending}
              className="rounded-full"
            >
              <UserCheck className={`h-4 w-4 mr-2`} />
              {pending ? "Approving..." : "Approve All for Team Access"}
            </Button>
            <Button
              variant="outline"
              onClick={handleReset}
              disabled={pending}
              className="rounded-full"
            >
              Sync Again
            </Button>
          </div>
          {approveResult && (
            <p className="text-sm text-green-600 font-medium">{approveResult}</p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
