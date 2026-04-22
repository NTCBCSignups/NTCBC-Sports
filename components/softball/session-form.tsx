"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { feedback } from "@/lib/styles";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { createSession } from "@/app/softball/actions/sessions";
import type { SessionType } from "@/lib/supabase/types";

export default function SessionForm() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [sessionType, setSessionType] =
    useState<SessionType>("drop_in_practice");

  const autoFillSignupClose = (form: HTMLFormElement) => {
    const date = (form.elements.namedItem("date") as HTMLInputElement)?.value;
    const timeStart = (
      form.elements.namedItem("time_start") as HTMLInputElement
    )?.value;
    const signupCloseInput = form.elements.namedItem(
      "signup_close",
    ) as HTMLInputElement;
    const signupOpenInput = form.elements.namedItem(
      "signup_open",
    ) as HTMLInputElement;

    // Auto-fill signup_close if it's empty and we have both date and time_start
    if (date && timeStart && signupCloseInput && !signupCloseInput.value) {
      const signupCloseValue = `${date}T${timeStart}`;
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
    setSuccess(false);

    const form = new FormData(e.currentTarget);
    const date = form.get("date") as string;
    const timeStart = form.get("time_start") as string;
    const timeEnd = form.get("time_end") as string;
    const signupOpenRaw = (form.get("signup_open") as string) || "";
    const signupCloseRaw = (form.get("signup_close") as string) || "";
    const signupOpen = signupOpenRaw ? new Date(signupOpenRaw) : null;
    const signupClose = signupCloseRaw ? new Date(signupCloseRaw) : null;

    // Create datetime objects for session start/end
    const sessionStart = new Date(`${date}T${timeStart}`);
    const sessionEnd = new Date(`${date}T${timeEnd}`);

    // Validate time ranges
    if (timeStart >= timeEnd) {
      setError("Session start time must be before end time");
      setPending(false);
      return;
    }

    if (signupOpen && signupClose && signupOpen >= signupClose) {
      setError("Sign-up open time must be before sign-up close time");
      setPending(false);
      return;
    }

    if (signupOpen && signupOpen > sessionStart) {
      setError("Sign-up open time cannot be after session start time");
      setPending(false);
      return;
    }

    if (signupClose && signupClose > sessionEnd) {
      setError("Sign-up close time must be before or at session end time");
      setPending(false);
      return;
    }

    const result = await createSession({
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
      signup_open: signupOpen ? signupOpen.toISOString() : null,
      signup_close: signupClose ? signupClose.toISOString() : null,
      notes: (form.get("notes") as string) || undefined,
    });

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
      (e.target as HTMLFormElement).reset();
      setSessionType("drop_in_practice");
    }
    setPending(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="session_type">Session Type</Label>
          <Select
            value={sessionType}
            onValueChange={(v) => setSessionType(v as SessionType)}
          >
            <SelectTrigger id="session_type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="drop_in_practice">Drop-in Practice</SelectItem>
              <SelectItem value="scheduled_game">Scheduled Game</SelectItem>
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
            onChange={handleDateOrTimeChange}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="time_end">End Time</Label>
          <Input id="time_end" name="time_end" type="time" required />
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
            <Label htmlFor="signup_open">
              Sign-ups Open{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input id="signup_open" name="signup_open" type="datetime-local" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="signup_close">
              Sign-ups Close{" "}
              <span className="font-normal text-gray-400">(optional)</span>
            </Label>
            <Input
              id="signup_close"
              name="signup_close"
              type="datetime-local"
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
      {success && (
        <p className={feedback.success}>Session created successfully.</p>
      )}

      <Button type="submit" disabled={pending} className="rounded-full">
        {pending ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
}
