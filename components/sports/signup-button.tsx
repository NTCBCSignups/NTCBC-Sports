"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  signUpForSession,
  cancelSignup,
  declineSession,
  type SignupPlacement,
} from "@/lib/actions/signups";
import type { SignupStatus } from "@/lib/supabase/types";
import type { SignupConfirmationDialog } from "@/config/config-resolver";
import { feedback, toastClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

type ActiveSignupStatus = SignupPlacement["status"];

interface SignupButtonProps {
  sessionId: string;
  isOpen: boolean;
  userSignupStatus: SignupStatus | null;
  isEligible: boolean;
  showStatusText?: boolean;
  /** When provided, shows a confirmation dialog before signup. */
  signupConfirmationDialog?: SignupConfirmationDialog;
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
  signupConfirmationDialog,
  className,
  buttonClassName,
}: SignupButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [localStatus, setLocalStatus] = useState(userSignupStatus);
  const [error, setError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showRejectedMessage, setShowRejectedMessage] = useState(false);

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

  const initiateSignup = () => {
    if (signupConfirmationDialog) {
      setShowRejectedMessage(false);
      setShowConfirmDialog(true);
    } else {
      handleSignup();
    }
  };

  const handleConfirmYes = () => {
    setShowConfirmDialog(false);
    handleSignup();
  };

  const handleCancel = async () => {
    setPending(true);
    setError(null);
    const previousStatus = localStatus;
    const result = await cancelSignup(sessionId);
    if ("error" in result) {
      setError(result.error);
    } else {
      setLocalStatus("cancelled");
      toast("Response removed.");
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

  const confirmationDialog = signupConfirmationDialog && (
    <AlertDialog open={showConfirmDialog} onOpenChange={(open) => {
      if (!open && !showRejectedMessage) setShowConfirmDialog(false);
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Signup Confirmation</AlertDialogTitle>
          <AlertDialogDescription>
            {showRejectedMessage
              ? signupConfirmationDialog.rejectedMessage
              : signupConfirmationDialog.message}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-row justify-end">
          {showRejectedMessage ? (
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
            }}>
              Dismiss
            </AlertDialogCancel>
          ) : (
            <>
              <AlertDialogAction onClick={(e) => {
                e.preventDefault();
                handleConfirmYes();
              }}>
                Yes
              </AlertDialogAction>
              <AlertDialogCancel onClick={(e) => {
                e.preventDefault();
                const hasRejectedMessage = !!signupConfirmationDialog.rejectedMessage;
                if (hasRejectedMessage) {
                  setShowRejectedMessage(true);
                } else {
                  setShowConfirmDialog(false);
                }
              }}>
                No
              </AlertDialogCancel>
            </>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  if (localStatus === "confirmed" || localStatus === "waitlisted") {
    return (
      <div className={cn("space-y-2", className)}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          {showStatusText && (
            <span className="text-sm text-muted-foreground">
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
            className={cn("px-8", buttonClassName)}
          >
            {pending ? "Cancelling..." : "Remove Sign-up"}
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
            <span className="text-sm text-muted-foreground">
              You marked this session as{" "}
              <span className="font-semibold">unable to join</span>.
            </span>
          )}
          <div className="flex flex-wrap gap-2">
            {isOpen && isEligible && (
              <Button
                onClick={initiateSignup}
                disabled={pending}
                className={cn("px-8", buttonClassName)}
              >
                {pending ? "Signing up..." : "Sign up instead"}
              </Button>
            )}
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={pending}
              className={cn("px-8", buttonClassName)}
            >
              {pending ? "Cancelling..." : "Remove Attendance"}
            </Button>
          </div>
        </div>
        {error && <p className={feedback.error}>{error}</p>}
        {confirmationDialog}
      </div>
    );
  }

  if (!isOpen) {
    return (
      <Button
        disabled
        className={cn(
          "px-8 has-[>svg]:px-8",
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
          "px-8 has-[>svg]:px-8",
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
          onClick={initiateSignup}
          disabled={pending}
          className={cn(
            "px-8 has-[>svg]:px-8",
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
            "px-8",
            buttonClassName,
          )}
        >
          {pending ? "..." : "Unable to join"}
        </Button>
      </div>
      {error && <p className={feedback.error}>{error}</p>}
      {confirmationDialog}
    </div>
  );
}
