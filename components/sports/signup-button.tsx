"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  signUpForSession,
  cancelSignup,
} from "@/app/softball/actions/signups";
import type { SignupStatus } from "@/lib/supabase/types";

interface SignupButtonProps {
  sessionId: string;
  isOpen: boolean;
  userSignupStatus: SignupStatus | null;
  isEligible: boolean;
}

export default function SignupButton({
  sessionId,
  isOpen,
  userSignupStatus,
  isEligible,
}: SignupButtonProps) {
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(userSignupStatus);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setPending(true);
    setError(null);
    const result = await signUpForSession(sessionId);
    if (result.error) {
      setError(result.error);
    } else {
      setLocalStatus("confirmed");
    }
    setPending(false);
  };

  const handleCancel = async () => {
    setPending(true);
    setError(null);
    const result = await cancelSignup(sessionId);
    if (result.error) {
      setError(result.error);
    } else {
      setLocalStatus("cancelled");
    }
    setPending(false);
  };

  if (!isOpen) {
    return (
      <Button disabled className="w-full sm:w-auto rounded-full px-8">
        Sign-ups closed
      </Button>
    );
  }

  if (!isEligible) {
    return (
      <Button disabled className="w-full sm:w-auto rounded-full px-8">
        Team members only
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {localStatus === "confirmed" || localStatus === "waitlisted" ? (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-sm text-gray-700">
            You are{" "}
            <span className="font-semibold">
              {localStatus === "confirmed" ? "confirmed" : "on the waitlist"}
            </span>{" "}
            for this session.
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            disabled={pending}
            className="rounded-full"
          >
            {pending ? "Cancelling..." : "Cancel Sign-up"}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleSignup}
          disabled={pending}
          className="w-full sm:w-auto rounded-full px-8"
        >
          {pending ? "Signing up..." : "Sign up"}
        </Button>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
