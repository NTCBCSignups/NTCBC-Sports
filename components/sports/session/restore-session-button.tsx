"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { restoreSession } from "@/lib/actions/sessions";
import { colors } from "@/lib/styles";

interface RestoreSessionButtonProps {
  sport: string;
  sessionId: string;
  /** Render an icon-only button or a full labeled button. */
  variant?: "icon" | "full";
}

export default function RestoreSessionButton({
  sport,
  sessionId,
  variant = "icon",
}: RestoreSessionButtonProps) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const handleRestore = async () => {
    setPending(true);
    const result = await restoreSession(sport, sessionId);
    setPending(false);

    if ("error" in result) {
      toast.error(result.error);
      return;
    }

    toast("Session restored.");
    router.refresh();
  };

  if (variant === "icon") {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleRestore}
        disabled={pending}
        className={colors.successHover}
        title="Restore session"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      size="sm"
      variant="outline"
      onClick={handleRestore}
      disabled={pending}
      className="shrink-0"
    >
      <RotateCcw className="h-4 w-4 mr-1.5" />
      {pending ? "Restoring..." : "Restore Session"}
    </Button>
  );
}
