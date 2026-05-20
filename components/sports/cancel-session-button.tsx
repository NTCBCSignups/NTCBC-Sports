"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { XCircle } from "lucide-react";
import { cancelSession } from "@/lib/actions/sessions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { colors } from "@/lib/styles";

interface CancelSessionButtonProps {
  sport: string;
  sessionId: string;
  /** Render a full-width button instead of an icon-only button. */
  variant?: "icon" | "full";
}

export default function CancelSessionButton({
  sport,
  sessionId,
  variant = "icon",
}: CancelSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleCancel = async () => {
    setPending(true);
    const result = await cancelSession(sport, sessionId);
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    setOpen(false);
    toast("Session cancelled.");
    router.refresh();
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        {variant === "icon" ? (
          <Button
            variant="ghost"
            size="sm"
            className={colors.warningHover}
            title="Cancel session"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="text-warning">
            <XCircle className="h-4 w-4 mr-1.5" />
            Cancel Session
          </Button>
        )}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel this session?</AlertDialogTitle>
          <AlertDialogDescription>
            This will mark the session as cancelled. Participants will see
            that the session is no longer happening.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Go Back</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleCancel}
            disabled={pending}
          >
            {pending ? "Cancelling..." : "Cancel Session"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
