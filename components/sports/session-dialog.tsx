"use client";

import { type ReactNode, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import SessionForm from "@/components/sports/session-form";
import type { SportSession } from "@/lib/supabase/types";

interface SessionDialogProps {
  sport: string;
  session?: SportSession;
  trigger: ReactNode;
}

export default function SessionDialog({ sport, session, trigger }: SessionDialogProps) {
  const [open, setOpen] = useState(false);
  const isEdit = !!session;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Session" : "Create Session"}</DialogTitle>
        </DialogHeader>
        <SessionForm
          sport={sport}
          session={session}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
