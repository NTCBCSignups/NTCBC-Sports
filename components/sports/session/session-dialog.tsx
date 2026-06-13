"use client";

import { type ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import SessionForm from "@/components/sports/session/session-form";
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1.5" />
            {isEdit ? "Edit" : "Create"}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg [&_form]:min-w-0 [&_input]:min-w-0">
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
          defaultTab={defaultTab}
          session={session}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
