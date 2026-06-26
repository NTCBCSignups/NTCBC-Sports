"use client";

import { type ReactNode, useMemo, useState } from "react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import SessionForm, {
  sessionToFormState,
  type SessionFormState,
} from "@/components/sports/session/session-form";
import type { SportSession } from "@/lib/supabase/types";

interface SessionTypeOption {
  value: string;
  label: string;
}

interface SessionDialogProps {
  sport: string;
  sessionTabs: SessionTypeOption[];
  defaultTab?: string;
  session?: SportSession;
  trigger?: ReactNode;
}

export default function SessionDialog({
  sport,
  sessionTabs,
  defaultTab,
  session,
  trigger,
}: SessionDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!session;
  const defaultSessionType = session?.session_type ?? defaultTab ?? sessionTabs[0]?.value ?? "";
  const serverState = useMemo(
    () => sessionToFormState(session, defaultSessionType),
    [session, defaultSessionType],
  );

  return (
    <FormDialog<SessionFormState>
      draftKey={isEdit ? `session-edit:${sport}:${session.id}` : `session-create:${sport}`}
      serverState={serverState}
      open={open}
      onOpenChange={setOpen}
      showCloseButton
      className="sm:max-w-lg [&_form]:min-w-0 [&_input]:min-w-0"
      trigger={
        trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1.5" />
            {isEdit ? "Edit" : "Create"}
          </Button>
        )
      }
    >
      <DialogHeader>
        <DialogTitle>{isEdit ? "Edit Session" : "Create Session"}</DialogTitle>
        <DialogDescription>
          {isEdit
            ? "Update the session details below."
            : "Fill in the details to create a new session."}
        </DialogDescription>
      </DialogHeader>
      <SessionForm
        sport={sport}
        sessionTabs={sessionTabs}
        session={session}
        onSuccess={() => setOpen(false)}
      />
    </FormDialog>
  );
}
