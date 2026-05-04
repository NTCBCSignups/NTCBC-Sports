"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  signUpForSession,
  cancelSignup,
  declineSession,
  type SignupPlacement,
} from "@/lib/actions/signups";
import type { SignupStatus } from "@/lib/supabase/types";
import { feedback, toastClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

type ActiveSignupStatus = SignupPlacement["status"];

interface SignupButtonProps {
  sessionId: string;
  isOpen: boolean;
  userSignupStatus: SignupStatus | null;
  isEligible: boolean;
  showStatusText?: boolean;
  className?: string;
  buttonClassName?: string;
}

const signupToastClassByStatus: Record<ActiveSignupStatus, string> = {
  confirmed: toastClasses.green,
  waitlisted: toastClasses.amber,
};

function signupMessage(placement: SignupPlacement): string {
  if (placement.status === "waitlisted") {
    return `You are on the waitlist.${
      placement.position ? ` You are #${placement.position}` : ""
    }`;
  }

  const position = placement.position
    ? `#${placement.position}`
    : "on the list";
  const cap = placement.playerCap ? ` / ${placement.playerCap}` : "";
  return `You are confirmed for this session. You are ${position}${cap}`;
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
    if ("error" in result) {
      setError(result.error);
    } else {
      setLocalStatus(result.status);
      toast(signupMessage(result), {
        className: signupToastClassByStatus[result.status],
      });
      router.refresh();
    }
    setPending(false);
  };

  const handleCancel = async () => {
    setPending(true);
    setError(null);
    const result = await cancelSignup(sessionId);
    if ("error" in result) {
      setError(result.error);
    } else {
      setLocalStatus("cancelled");
      toast("Your sign-up has been cancelled.");
      router.refresh();
    }
    setPending(false);
  };

  const handleDecline = async () => {
    setPending(true);
    setError(null);
    const result = await declineSession(sessionId);
    if ("error" in result) {
      setError(result.error);
    } else {
      setLocalStatus("declined");
      toast("Marked as unable to join.");
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

  if (localStatus === "declined") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {showStatusText && (
            <span className="text-sm text-gray-700">
              You marked this session as{" "}
              <span className="font-semibold">unable to join</span>.
            </span>
          )}
          {isOpen && isEligible && (
            <Button
              onClick={handleSignup}
              disabled={pending}
              className={cn("rounded-full px-8", buttonClassName)}
            >
              {pending ? "Signing up..." : "Sign up instead"}
            </Button>
          )}
        </div>
        {error && <p className={feedback.error}>{error}</p>}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        disabled
        className={cn(
          "w-full sm:w-auto rounded-full px-8 has-[>svg]:px-8",
          buttonClassName,
        )}
      >
        <Lock className="h-4 w-4 shrink-0" />
        Sign-ups closed
      </Button>
    );
  }

  if (!isEligible) {
    return (
      <Button
        disabled
        className={cn(
          "w-full sm:w-auto rounded-full px-8 has-[>svg]:px-8",
          buttonClassName,
        )}
      >
        Team members only
      </Button>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex flex-wrap gap-2">
        <Button
          onClick={handleSignup}
          disabled={pending}
          className={cn(
            "w-full sm:w-auto rounded-full px-8 has-[>svg]:px-8",
            buttonClassName,
          )}
        >
          {pending ? "Signing up..." : "Sign up"}
        </Button>
        <Button
          variant="outline"
          onClick={handleDecline}
          disabled={pending}
          className={cn(
            "w-full sm:w-auto rounded-full px-8",
            buttonClassName,
          )}
        >
          {pending ? "..." : "Unable to join"}
        </Button>
      </div>
      {error && <p className={feedback.error}>{error}</p>}
    </div>
  );
}
