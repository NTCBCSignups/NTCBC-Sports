"use client";

import { useCallback, useRef, useState, type ReactNode, type RefObject } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feedback, toastClasses } from "@/lib/styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Pencil } from "lucide-react";
import { FormDialog } from "@/components/ui/form-dialog";
import { createSession, updateSession } from "@/lib/actions/sessions";
import { parseSessionInput } from "@/lib/actions/session-validation";
import { getSessionPath } from "@/lib/session-route";
import { useConfigurator } from "@/components/ui/configurator";
import type { SportSession } from "@/lib/supabase/types";

interface SessionTypeOption {
  value: string;
  label: string;
}

interface SessionFormProps {
  sport: string;
  sessionTabs: SessionTypeOption[];
  session?: SportSession;
  sportUsers?: { id: string; name: string }[];
  onSuccess?: () => void;
  formRef?: RefObject<HTMLFormElement | null>;
  onPendingChange?: (pending: boolean) => void;
}

export interface SessionFormState {
  session_type: string;
  title: string;
  date: string;
  time_start: string;
  time_end: string;
  location_name: string;
  location_address: string;
  location_maps_link: string;
  player_cap: string;
  signup_open: string;
  signup_close: string;
  notes: string;
  facilitator_id: string;
}

/** Convert an ISO datetime string to a datetime-local input value (YYYY-MM-DDTHH:mm). */
function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

function QuickFillButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="cursor-pointer text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export function sessionToFormState(
  session: SportSession | undefined,
  defaultSessionType: string,
): SessionFormState {
  return {
    session_type: session?.session_type ?? defaultSessionType,
    title: session?.title ?? "",
    date: session?.date ?? "",
    time_start: session?.time_start ?? "",
    time_end: session?.time_end ?? "",
    location_name: session?.location_name ?? "",
    location_address: session?.location_address ?? "",
    location_maps_link: session?.location_maps_link ?? "",
    player_cap: session?.player_cap != null ? String(session.player_cap) : "",
    signup_open: session?.signup_open ? toDatetimeLocal(session.signup_open) : "",
    signup_close: session?.signup_close ? toDatetimeLocal(session.signup_close) : "",
    notes: session?.notes ?? "",
    facilitator_id: session?.facilitator_id ?? "",
  };
}

export default function SessionForm({
  sport,
  sessionTabs,
  session,
  sportUsers,
  onSuccess,
  formRef: externalFormRef,
  onPendingChange,
}: SessionFormProps) {
  const isEdit = !!session;
  const { draft, updateDraft, save, discard } = useConfigurator<SessionFormState>();
  const internalFormRef = useRef<HTMLFormElement>(null);
  const formRef = externalFormRef ?? internalFormRef;
  const [pending, setPendingRaw] = useState(false);
  const setPending = useCallback(
    (v: boolean) => {
      setPendingRaw(v);
      onPendingChange?.(v);
    },
    [onPendingChange],
  );
  const [error, setError] = useState<string | null>(null);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);

  const handleField =
    (field: keyof SessionFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      updateDraft((prev) => {
        const next = { ...prev, [field]: value };
        // Auto-fill signup times when date or time_end changes
        if ((field === "date" || field === "time_end") && next.date && next.time_end) {
          if (!prev.signup_close) {
            next.signup_close = `${next.date}T${next.time_end}`;
          }
          if (!prev.signup_open && next.signup_close) {
            const close = new Date(next.signup_close);
            close.setDate(close.getDate() - 7);
            next.signup_open = toDatetimeLocal(close.toISOString());
          }
        }
        return next;
      });
    };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setCreatedSessionId(null);

    // Client-side local-time check: signup close date must match session date.
    // The raw datetime-local value has the true local date (before ISO conversion).
    const closeLocalDate = draft.signup_close.slice(0, 10);
    if (closeLocalDate && draft.date && closeLocalDate > draft.date) {
      setError("Sign-up close time must be on the session date (by 11:59 PM)");
      setPending(false);
      return;
    }

    const input = {
      session_type: draft.session_type,
      title: draft.title,
      date: draft.date,
      time_start: draft.time_start,
      time_end: draft.time_end,
      location_name: draft.location_name,
      location_address: draft.location_address,
      location_maps_link: draft.location_maps_link,
      player_cap: draft.player_cap ? parseInt(draft.player_cap) : null,
      signup_open: new Date(draft.signup_open).toISOString(),
      signup_close: new Date(draft.signup_close).toISOString(),
      notes: draft.notes,
      facilitator_id: draft.facilitator_id || null,
    };

    const parsed = parseSessionInput(input);
    if (!parsed.success) {
      setError(parsed.error);
      setPending(false);
      return;
    }

    if (isEdit) {
      const result = await updateSession(sport, session.id, parsed.data);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error, { className: toastClasses.red });
      } else {
        toast.success("Session updated.", { className: toastClasses.green });
        save();
        onSuccess?.();
      }
    } else {
      const result = await createSession(sport, parsed.data);
      if ("error" in result) {
        setError(result.error);
        toast.error(result.error, { className: toastClasses.red });
      } else {
        setCreatedSessionId(result.sessionId);
        toast.success("Session created successfully.", {
          className: toastClasses.green,
        });
        discard();
      }
    }
    setPending(false);
  };

  const createdSessionHref = createdSessionId ? getSessionPath(sport, createdSessionId) : "#";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 min-w-0">
      <div className="space-y-2">
        <Label htmlFor="session_type">Session Type</Label>
        <Select
          value={draft.session_type}
          onValueChange={(v) => updateDraft((prev) => ({ ...prev, session_type: v }))}
        >
          <SelectTrigger id="session_type">
            <SelectValue placeholder="Select a session type" />
          </SelectTrigger>
          <SelectContent>
            {sessionTabs.map((tab) => (
              <SelectItem key={tab.value} value={tab.value}>
                {tab.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 min-w-0 overflow-hidden [&>*]:min-w-0">
        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="title"
            name="title"
            placeholder="e.g. Week 5 vs Team B"
            value={draft.title}
            onChange={handleField("title")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            value={draft.date}
            onChange={handleField("date")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="player_cap">
            Player Cap <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="player_cap"
            name="player_cap"
            type="number"
            min={1}
            placeholder="No limit"
            value={draft.player_cap}
            onChange={handleField("player_cap")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_start">Start Time</Label>
          <Input
            id="time_start"
            name="time_start"
            type="time"
            required
            value={draft.time_start}
            onChange={handleField("time_start")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_end">End Time</Label>
          <Input
            id="time_end"
            name="time_end"
            type="time"
            required
            value={draft.time_end}
            onChange={handleField("time_end")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_name">Location Name</Label>
          <Input
            id="location_name"
            name="location_name"
            placeholder="e.g. Christie Pits Diamond 1"
            required
            value={draft.location_name}
            onChange={handleField("location_name")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_address">Location Address</Label>
          <Input
            id="location_address"
            name="location_address"
            placeholder="e.g. 750 Bloor St W, Toronto"
            required
            value={draft.location_address}
            onChange={handleField("location_address")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_maps_link">
            Maps Link <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="location_maps_link"
            name="location_maps_link"
            type="url"
            placeholder="https://maps.app.goo.gl/..."
            value={draft.location_maps_link}
            onChange={handleField("location_maps_link")}
          />
          {draft.location_maps_link && /^https?:\/\/.+/.test(draft.location_maps_link) && (
            <a
              href={draft.location_maps_link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              <ExternalLink className="h-3 w-3" />
              Open in Maps
            </a>
          )}
        </div>

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2 min-w-0 [&>*]:min-w-0">
          <div className="space-y-2">
            <Label htmlFor="signup_open">Sign-ups Open</Label>
            <Input
              id="signup_open"
              name="signup_open"
              type="datetime-local"
              required
              value={draft.signup_open}
              onChange={handleField("signup_open")}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="signup_close">Sign-ups Close</Label>
              <QuickFillButton
                label="End of day"
                onClick={() => {
                  if (draft.date) {
                    updateDraft((prev) => ({ ...prev, signup_close: `${prev.date}T23:59` }));
                  }
                }}
              />
            </div>
            <Input
              id="signup_close"
              name="signup_close"
              type="datetime-local"
              required
              value={draft.signup_close}
              onChange={handleField("signup_close")}
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes <span className="font-normal text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Additional details about this session..."
          rows={3}
          value={draft.notes}
          onChange={handleField("notes")}
        />
      </div>

      {sportUsers && sportUsers.length > 0 && (
        <div className="space-y-2">
          <Label htmlFor="facilitator_id">
            Facilitator <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Select
            value={draft.facilitator_id}
            onValueChange={(v) =>
              updateDraft((prev) => ({ ...prev, facilitator_id: v === "none" ? "" : v }))
            }
          >
            <SelectTrigger id="facilitator_id">
              <SelectValue placeholder="No facilitator" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No facilitator</SelectItem>
              {sportUsers.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {error && <p className={feedback.error}>{error}</p>}
      {!isEdit && createdSessionId && (
        <p className={feedback.success}>
          Session created.{" "}
          <Link href={createdSessionHref} className="underline underline-offset-2">
            View the session
          </Link>
          .
        </p>
      )}

      {/* Hide inline submit when parent controls submission via formRef */}
      {!externalFormRef && (
        <Button type="submit" disabled={pending}>
          {pending
            ? isEdit
              ? "Saving..."
              : "Creating..."
            : isEdit
              ? "Save Changes"
              : "Create Session"}
        </Button>
      )}
    </form>
  );
}

// ── Dialog wrapper ───────────────────────────────────────────────

interface SessionFormDialogProps {
  sport: string;
  sessionTabs: SessionTypeOption[];
  defaultTab?: string;
  session?: SportSession;
  sportUsers?: { id: string; name: string }[];
  trigger?: ReactNode;
}

export function SessionFormDialog({
  sport,
  sessionTabs,
  defaultTab,
  session,
  sportUsers,
  trigger,
}: SessionFormDialogProps) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isEdit = !!session;
  const defaultSessionType = session?.session_type ?? defaultTab ?? sessionTabs[0]?.value ?? "";
  const serverState = sessionToFormState(session, defaultSessionType);

  return (
    <FormDialog<SessionFormState>
      draftKey={isEdit ? `session-edit:${sport}:${session.id}` : `session-create:${sport}`}
      serverState={serverState}
      open={open}
      onOpenChange={setOpen}
      onSave={() => formRef.current?.requestSubmit()}
      showCloseButton
      className="sm:max-w-lg [&_form]:min-w-0 [&_form]:overflow-x-hidden [&_input]:min-w-0"
      trigger={
        trigger ?? (
          <Button variant="outline" size="sm">
            <Pencil className="h-4 w-4 mr-1.5" />
            {isEdit ? "Edit" : "Create"}
          </Button>
        )
      }
    >
      {(state) => (
        <>
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
            sportUsers={sportUsers}
            onSuccess={() => setOpen(false)}
            formRef={formRef}
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={!state.isDirty}
              onClick={() => state.discard()}
            >
              Reset
            </Button>
            <Button
              type="button"
              disabled={!state.isDirty}
              onClick={() => formRef.current?.requestSubmit()}
            >
              {isEdit ? "Save Changes" : "Create Session"}
            </Button>
          </DialogFooter>
        </>
      )}
    </FormDialog>
  );
}
