"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSportConfig, type CreateSportConfigInput } from "@/lib/actions/create-sport-config";
import { toastClasses } from "@/lib/styles";

const PLACEHOLDERS: CreateSportConfigInput = {
  id: "badminton",
  emoji: "🏸",
  name: "Badminton",
  type: "Drop-in Sessions",
  day: "Friday nights",
  organizers: "Daniel, Josh",
  locationName: "NTCBC Gym",
  locationAddress: "88 Finch Ave W, North York, ON M2N 1Y9",
};

const EMPTY_FORM: CreateSportConfigInput = {
  id: "",
  emoji: "",
  name: "",
  type: "",
  day: "",
  organizers: "",
  locationName: "",
  locationAddress: "",
};

export default function CreateSportDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const [form, setForm] = useState(EMPTY_FORM);

  const set = (field: keyof CreateSportConfigInput, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const trimmed: CreateSportConfigInput = Object.fromEntries(
        Object.entries(form).map(([k, v]) => [k, v.trim()]),
      ) as CreateSportConfigInput;
      const result = await createSportConfig(trimmed);

      if (result.success) {
        toast.success("Sport created! Redirecting to settings…", {
          className: toastClasses.green,
        });
        setOpen(false);
        setForm(EMPTY_FORM);
        router.push(`/${result.id}/admin`);
      } else {
        toast.error(result.error, { className: toastClasses.red });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1.5" />
          Create Sport
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Sport</DialogTitle>
          <DialogDescription>
            Set up a new sport. You can configure tabs and permissions in settings after creation.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="create-sport-id">Sport ID</Label>
              <Input
                id="create-sport-id"
                placeholder={`e.g. ${PLACEHOLDERS.id}`}
                value={form.id}
                onChange={(e) => set("id", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
              />
              <p className="text-xs text-muted-foreground">
                Used in the URL (e.g. /{PLACEHOLDERS.id}). Cannot be changed after creation.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-emoji">Emoji</Label>
              <Input
                id="create-sport-emoji"
                placeholder={`e.g. ${PLACEHOLDERS.emoji}`}
                value={form.emoji}
                onChange={(e) => set("emoji", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-name">Name</Label>
              <Input
                id="create-sport-name"
                placeholder={`e.g. ${PLACEHOLDERS.name}`}
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-type">Type</Label>
              <Input
                id="create-sport-type"
                placeholder={`e.g. ${PLACEHOLDERS.type}`}
                value={form.type}
                onChange={(e) => set("type", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-day">Schedule</Label>
              <Input
                id="create-sport-day"
                placeholder={`e.g. ${PLACEHOLDERS.day}`}
                value={form.day}
                onChange={(e) => set("day", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-organizers">Organisers</Label>
              <Input
                id="create-sport-organizers"
                placeholder={`e.g. ${PLACEHOLDERS.organizers}`}
                value={form.organizers}
                onChange={(e) => set("organizers", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-location">Location</Label>
              <Input
                id="create-sport-location"
                placeholder={`e.g. ${PLACEHOLDERS.locationName}`}
                value={form.locationName}
                onChange={(e) => set("locationName", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-address">Address</Label>
              <Input
                id="create-sport-address"
                placeholder={`e.g. ${PLACEHOLDERS.locationAddress}`}
                value={form.locationAddress}
                onChange={(e) => set("locationAddress", e.target.value)}
                required
              />
            </div>
          </div>
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <Card className="max-w-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {form.emoji || PLACEHOLDERS.emoji} {form.name || PLACEHOLDERS.name}
                </CardTitle>
                <CardDescription>{form.type || PLACEHOLDERS.type}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>{form.day || PLACEHOLDERS.day}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
