"use client";

import { useState } from "react";
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
import { createSession, type CreateSessionResult } from "@/lib/actions/sessions";
import { resolvedSportsConfig } from "@/config/config-resolver";

interface SessionFormProps {
  sport: string;
}

export default function SessionForm({ sport }: SessionFormProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdSessionId, setCreatedSessionId] = useState<string | null>(null);
  const sportConfig = resolvedSportsConfig[sport];
  const tabs = sportConfig?.tabs ?? [];
  const defaultSessionType = sportConfig?.defaultTab ?? tabs[0]?.value ?? "";
  const [sessionType, setSessionType] =
    useState(defaultSessionType);

  const autoFillSignupClose = (form: HTMLFormElement) => {
    const date = (form.elements.namedItem("date") as HTMLInputElement)?.value;
    const timeEnd = (
      form.elements.namedItem("time_end") as HTMLInputElement
    )?.value;
    const signupCloseInput = form.elements.namedItem(
      "signup_close",
    ) as HTMLInputElement;
    const signupOpenInput = form.elements.namedItem(
      "signup_open",
    ) as HTMLInputElement;

    // Auto-fill signup_close if it's empty and we have both date and time_end
    if (date && timeEnd && signupCloseInput && !signupCloseInput.value) {
      const signupCloseValue = `${date}T${timeEnd}`;
      signupCloseInput.value = signupCloseValue;

      // Also auto-fill signup_open to one week before signup_close if it's empty
      if (signupOpenInput && !signupOpenInput.value) {
        const signupCloseDate = new Date(signupCloseValue);
        const signupOpenDate = new Date(signupCloseDate);
        signupOpenDate.setDate(signupOpenDate.getDate() - 7); // One week before

        // Format as datetime-local: YYYY-MM-DDTHH:mm
        const year = signupOpenDate.getFullYear();
        const month = String(signupOpenDate.getMonth() + 1).padStart(2, "0");
        const day = String(signupOpenDate.getDate()).padStart(2, "0");
        const hours = String(signupOpenDate.getHours()).padStart(2, "0");
        const minutes = String(signupOpenDate.getMinutes()).padStart(2, "0");

        signupOpenInput.value = `${year}-${month}-${day}T${hours}:${minutes}`;
      }
    }
  };

  const handleDateOrTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const form = e.currentTarget.form;
    if (form) {
      autoFillSignupClose(form);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setCreatedSessionId(null);

    const form = new FormData(e.currentTarget);
    const date = form.get("date") as string;
    const timeStart = form.get("time_start") as string;
    const timeEnd = form.get("time_end") as string;
    const signupOpen = new Date(form.get("signup_open") as string);
    const signupClose = new Date(form.get("signup_close") as string);

    const sessionStart = new Date(`${date}T${timeStart}`);
    const sessionEnd = new Date(`${date}T${timeEnd}`);

    if (timeStart >= timeEnd) {
      setError("Session start time must be before end time");
      setPending(false);
      return;
    }

    if (signupOpen >= signupClose) {
      setError("Sign-up open time must be before sign-up close time");
      setPending(false);
      return;
    }

    if (signupOpen > sessionStart) {
      setError("Sign-up open time cannot be after session start time");
      setPending(false);
      return;
    }

    if (signupClose > sessionEnd) {
      setError("Sign-up close time must be before or at session end time");
      setPending(false);
      return;
    }

    const result = await createSession(sport, {
      session_type: sessionType,
      title: (form.get("title") as string) || undefined,
      date: date,
      time_start: timeStart,
      time_end: timeEnd,
      location_name: form.get("location_name") as string,
      location_address: form.get("location_address") as string,
      location_maps_link:
        (form.get("location_maps_link") as string) || undefined,
      player_cap: (form.get("player_cap") as string)
        ? parseInt(form.get("player_cap") as string)
        : null,
      signup_open: signupOpen.toISOString(),
      signup_close: signupClose.toISOString(),
      notes: (form.get("notes") as string) || undefined,
    });

    if ("error" in result) {
      setError(result.error);
      toast.error(result.error, { className: toastClasses.red });
    } else {
      setCreatedSessionId(result.sessionId);
      toast.success("Session created successfully.", {
        className: toastClasses.green,
      });
      (e.target as HTMLFormElement).reset();
      setSessionType(defaultSessionType);
    }
    setPending(false);
  };

  const createdSessionHref = createdSessionId
    ? `/${sport}/session/${createdSessionId}`
    : "#";

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="session_type">Session Type</Label>
          <Select
            value={sessionType}
            onValueChange={(v) => setSessionType(v)}
          >
            <SelectTrigger id="session_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>{tab.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="title">
            Title <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input id="title" name="title" placeholder="e.g. Week 5 vs Team B" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            onChange={handleDateOrTimeChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="player_cap">
            Player Cap <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            id="player_cap"
            name="player_cap"
            type="number"
            min={1}
            placeholder="No limit"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_start">Start Time</Label>
          <Input
            id="time_start"
            name="time_start"
            type="time"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_end">End Time</Label>
          <Input id="time_end" name="time_end" type="time" required onChange={handleDateOrTimeChange} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_name">Location Name</Label>
          <Input
            id="location_name"
            name="location_name"
            placeholder="e.g. Christie Pits Diamond 1"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_address">Location Address</Label>
          <Input
            id="location_address"
            name="location_address"
            placeholder="e.g. 750 Bloor St W, Toronto"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="location_maps_link">
            Maps Link <span className="font-normal text-gray-400">(optional)</span>
          </Label>
          <Input
            id="location_maps_link"
            name="location_maps_link"
            type="url"
            placeholder="https://maps.app.goo.gl/..."
          />
        </div>

        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="signup_open">Sign-ups Open</Label>
            <Input
              id="signup_open"
              name="signup_open"
              type="datetime-local"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup_close">Sign-ups Close</Label>
            <Input
              id="signup_close"
              name="signup_close"
              type="datetime-local"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="notes">
          Notes <span className="font-normal text-gray-400">(optional)</span>
        </Label>
        <Textarea
          id="notes"
          name="notes"
          placeholder="Additional details about this session..."
          rows={3}
        />
      </div>

      {error && <p className={feedback.error}>{error}</p>}
      {createdSessionId && (
        <p className={feedback.success}>
          Session created.{" "}
          <Link href={createdSessionHref} className="underline underline-offset-2">
            View the session
          </Link>
          .
        </p>
      )}

      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
}
