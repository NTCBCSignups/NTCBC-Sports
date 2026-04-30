"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/components/ui/sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  signUpForSession,
  cancelSignup,
} from "@/lib/actions/signups";
import type { SignupStatus } from "@/lib/supabase/types";
import { feedback } from "@/lib/styles";
import { cn } from "@/lib/utils";

type ActiveSignupStatus = Exclude<SignupStatus, "cancelled">;

interface SignupButtonProps {
  sessionId: string;
  isOpen: boolean;
  userSignupStatus: SignupStatus | null;
  isEligible: boolean;
  showStatusText?: boolean;
  className?: string;
  buttonClassName?: string;
}

const signupToastClasses = {
  confirmed:
    "!border-green-200 !bg-green-100 !text-green-800 [&_[data-title]]:!text-green-800",
  waitlisted:
    "!border-amber-200 !bg-amber-100 !text-amber-800 [&_[data-title]]:!text-amber-800",
} as const;

function signupMessage(result: {
  status?: ActiveSignupStatus;
  position?: number | null;
  playerCap?: number | null;
}) {
  if (result.status === "waitlisted") {
    return `You are on the waitlist.${
      result.position ? ` You are #${result.position}` : ""
    }`;
  }

  if (result.status === "confirmed") {
    const position = result.position ? `#${result.position}` : "on the list";
    const cap = result.playerCap ? ` / ${result.playerCap}` : "";
    return `You are confirmed for this session. You are ${position}${cap}`;
  }

  return "You are signed up for this session.";
}

export default function SignupButton({
  sessionId,
  isOpen,
  userSignupStatus,
  isEligible,
  showStatusText = true,
  className,
  buttonClassName,
}: SignupButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(userSignupStatus);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async () => {
    setPending(true);
    setError(null);
    const result = await signUpForSession(sessionId);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      const status: ActiveSignupStatus =
        "status" in result ? result.status : "confirmed";
      const placement = {
        status,
        position: "position" in result ? result.position : null,
        playerCap: "playerCap" in result ? result.playerCap : null,
      };
      setLocalStatus(status);
      toast(signupMessage(placement), {
        className: signupToastClasses[status],
      });
      router.refresh();
    }
    setPending(false);
  };

  const handleCancel = async () => {
    setPending(true);
    setError(null);
    const result = await cancelSignup(sessionId);
    if ("error" in result && result.error) {
      setError(result.error);
    } else {
      setLocalStatus("cancelled");
      toast("Your sign-up has been cancelled.");
      router.refresh();
    }
    setPending(false);
  };

  if (localStatus === "confirmed" || localStatus === "waitlisted") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {showStatusText && (
            <span className="text-sm text-gray-700">
              You are{" "}
              <span className="font-semibold">
                {localStatus === "confirmed" ? "confirmed" : "on the waitlist"}
              </span>{" "}
              for this session.
            </span>
          )}
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={pending}
            className={cn("rounded-full px-8", buttonClassName)}
          >
            {pending ? "Cancelling..." : "Cancel Sign-up"}
          </Button>
        </div>
        {error && <p className={feedback.error}>{error}</p>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        disabled
        className={cn("w-full sm:w-auto rounded-full px-8", buttonClassName)}
      >
        <Lock className="h-4 w-4 shrink-0" />
        Sign-up closed
      </Button>
    );
  }

  if (!isEligible) {
    return (
      <Button
        disabled
        className={cn("w-full sm:w-auto rounded-full px-8", buttonClassName)}
      >
        Team members only
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Button
        onClick={handleSignup}
        disabled={pending}
        className={cn("w-full sm:w-auto rounded-full px-8", buttonClassName)}
      >
        {pending ? "Signing up..." : "Sign up"}
      </Button>
      {error && <p className={feedback.error}>{error}</p>}
    </div>
  );
}
