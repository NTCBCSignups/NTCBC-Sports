"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteSession } from "@/app/softball/actions/sessions";
import { colors } from "@/lib/styles";

interface DeleteSessionButtonProps {
  sessionId: string;
}

export default function DeleteSessionButton({
  sessionId,
}: DeleteSessionButtonProps) {
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);

  const handleDelete = async () => {
    setPending(true);
    await deleteSession(sessionId);
    setPending(false);
    setConfirming(false);
  };

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className={`text-sm ${colors.destructive}`}>Delete?</span>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleDelete}
          disabled={pending}
        >
          {pending ? "..." : "Yes"}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
          disabled={pending}
        >
          No
        </Button>
      </div>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setConfirming(true)}
      className={colors.destructiveHover}
      title="Delete session"
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  );
}
