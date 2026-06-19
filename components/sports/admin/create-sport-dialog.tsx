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
import { createSportConfig } from "@/lib/actions/create-sport-config";
import { toastClasses } from "@/lib/styles";

export default function CreateSportDialog() {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const [id, setId] = useState("");
  const [emoji, setEmoji] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState("");
  const [day, setDay] = useState("");
  const [organizers, setOrganizers] = useState("");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");

  const resetForm = () => {
    setId("");
    setEmoji("");
    setName("");
    setType("");
    setDay("");
    setOrganizers("");
    setLocationName("");
    setLocationAddress("");
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await createSportConfig({
        id: id.trim(),
        emoji: emoji.trim(),
        name: name.trim(),
        type: type.trim(),
        day: day.trim(),
        organizers: organizers.trim(),
        locationName: locationName.trim(),
        locationAddress: locationAddress.trim(),
      });

      if (result.success) {
        toast.success("Sport created! Redirecting to settings…", {
          className: toastClasses.green,
        });
        setOpen(false);
        resetForm();
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
                placeholder="e.g. badminton"
                value={id}
                onChange={(e) => setId(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                required
              />{" "}
              <p className="text-xs text-muted-foreground">
                Used in the URL (e.g. /badminton). Cannot be changed after creation.
              </p>{" "}
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-emoji">Emoji</Label>
              <Input
                id="create-sport-emoji"
                placeholder="e.g. 🏸"
                value={emoji}
                onChange={(e) => setEmoji(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-name">Name</Label>
              <Input
                id="create-sport-name"
                placeholder="e.g. Badminton"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-type">Type</Label>
              <Input
                id="create-sport-type"
                placeholder="e.g. Drop-in Sessions"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-day">Schedule</Label>
              <Input
                id="create-sport-day"
                placeholder="e.g. Friday nights"
                value={day}
                onChange={(e) => setDay(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-organizers">Organisers</Label>
              <Input
                id="create-sport-organizers"
                placeholder="e.g. John, Jane"
                value={organizers}
                onChange={(e) => setOrganizers(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-location">Location</Label>
              <Input
                id="create-sport-location"
                placeholder="e.g. Community Centre Gym"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="create-sport-address">Address</Label>
              <Input
                id="create-sport-address"
                placeholder="e.g. 123 Main St"
                value={locationAddress}
                onChange={(e) => setLocationAddress(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="rounded-lg border border-dashed bg-muted/30 p-4">
            <Card className="max-w-sm overflow-hidden">
              <CardHeader>
                <CardTitle className="text-2xl">
                  {emoji || "🏅"} {name || "Sport Name"}
                </CardTitle>
                <CardDescription>{type || "Type"}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {day && (
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{day}</span>
                  </div>
                )}
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
