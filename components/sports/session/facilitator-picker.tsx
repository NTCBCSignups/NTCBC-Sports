"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { toastClasses } from "@/lib/styles";
import { assignFacilitator } from "@/lib/actions/sessions";
import { FacilitatorSelect } from "./facilitator-select";

interface FacilitatorPickerProps {
  sport: string;
  sessionId: string;
  currentFacilitatorId: string | null;
  sportUsers: { id: string; name: string; isTeamMember: boolean }[];
}

/**
 * Session-page shortcut button for assigning a facilitator.
 * Wraps the shared FacilitatorSelect with server action persistence + toast feedback.
 */
export default function FacilitatorPicker({
  sport,
  sessionId,
  currentFacilitatorId,
  sportUsers,
}: FacilitatorPickerProps) {
  const [pending, startTransition] = useTransition();
  const [selectedId, setSelectedId] = useState(currentFacilitatorId);

  function handleChange(userId: string | null) {
    setSelectedId(userId);
    startTransition(async () => {
      const result = await assignFacilitator(sport, sessionId, userId);
      if ("error" in result) {
        setSelectedId(currentFacilitatorId);
        toast.error(result.error, { className: toastClasses.red });
      } else {
        toast.success(userId ? "Facilitator assigned." : "Facilitator removed.", {
          className: toastClasses.green,
        });
      }
    });
  }

  return (
    <FacilitatorSelect
      value={selectedId}
      onChange={handleChange}
      users={sportUsers}
      disabled={pending}
    />
  );
}
