"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarDays, Copy, Download, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type ExportMode = "subscribe" | "download";

interface TabOption {
  value: string;
  label: string;
}

interface CalendarExportButtonProps {
  sport: string;
  userId: string;
  tabs: TabOption[];
}

export default function CalendarExportButton({ sport, userId, tabs }: CalendarExportButtonProps) {
  const [mode, setMode] = useState<ExportMode>("subscribe");
  const [selectedTabs, setSelectedTabs] = useState<Set<string>>(
    () => new Set(tabs.map((t) => t.value)),
  );
  const [includeHistory, setIncludeHistory] = useState(false);
  const [includeDeclined, setIncludeDeclined] = useState(false);
  const [open, setOpen] = useState(false);

  const allSelected = selectedTabs.size === tabs.length;

  function toggleAll(checked: boolean) {
    setSelectedTabs(checked ? new Set(tabs.map((t) => t.value)) : new Set());
  }

  function toggleTab(value: string, checked: boolean) {
    setSelectedTabs((prev) => {
      const next = new Set(prev);
      if (checked) next.add(value);
      else next.delete(value);
      return next;
    });
  }

  function buildUrl(): string {
    const base = `${window.location.origin}/api/calendar/${sport}`;
    const params = new URLSearchParams();
    params.set("userId", userId);
    params.set("mode", mode);
    if (mode === "subscribe") {
      params.set("subscribedAt", String(Date.now()));
    }
    if (!allSelected) {
      for (const tab of selectedTabs) {
        params.append("tab", tab);
      }
    }
    if (includeHistory) params.set("history", "true");
    if (includeDeclined) params.set("includeDeclined", "true");
    return `${base}?${params.toString()}`;
  }

  function handleSubscribe() {
    const httpUrl = buildUrl();
    const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");
    navigator.clipboard.writeText(webcalUrl).then(() => {
      toast.success("Subscription URL copied to clipboard", {
        description: "Paste this URL in your calendar app to subscribe.",
      });
      setOpen(false);
    });
  }

  function handleDownload() {
    const url = buildUrl();
    const a = document.createElement("a");
    a.href = url;
    a.download = `ntcbc-${sport}-sessions.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setOpen(false);
  }

  const hasSelection = selectedTabs.size > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CalendarDays className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Calendar Export</DialogTitle>
          <DialogDescription className="sr-only">
            Export sessions to your calendar app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Mode tabs */}
          <div className="flex gap-2">
            <ModeTab
              active={mode === "subscribe"}
              onClick={() => setMode("subscribe")}
              label="Subscribe"
            />
            <ModeTab
              active={mode === "download"}
              onClick={() => setMode("download")}
              label="Download"
            />
          </div>

          {/* Mode description */}
          <p className="text-sm text-muted-foreground">
            {mode === "subscribe"
              ? "Your calendar app will create a new calendar that automatically sync for new/updated sessions. Cancelled sessions appear as strikethrough."
              : "Download a snapshot of current sessions as an .ics file. You own the calendar events in a calendar of your choosing but this is a one-time export that won't update automatically."}
          </p>

          {/* Session type selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Session types</Label>
            <div className="flex items-center gap-2">
              <Checkbox
                id="cal-all"
                checked={allSelected}
                onCheckedChange={(checked) => toggleAll(checked === true)}
              />
              <Label htmlFor="cal-all" className="font-normal">
                All Sessions
              </Label>
            </div>
            {tabs.map((tab) => (
              <div key={tab.value} className="flex items-center gap-2 ml-4">
                <Checkbox
                  id={`cal-${tab.value}`}
                  checked={selectedTabs.has(tab.value)}
                  onCheckedChange={(checked) => toggleTab(tab.value, checked === true)}
                />
                <Label htmlFor={`cal-${tab.value}`} className="font-normal">
                  {tab.label}
                </Label>
              </div>
            ))}
          </div>

          {/* Include history checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="cal-history"
              checked={includeHistory}
              onCheckedChange={(checked) => setIncludeHistory(checked === true)}
            />
            <Label htmlFor="cal-history" className="text-sm font-normal">
              Include past sessions
            </Label>
          </div>

          {/* Include declined checkbox */}
          <div className="flex items-center gap-2">
            <Checkbox
              id="cal-declined"
              checked={includeDeclined}
              onCheckedChange={(checked) => setIncludeDeclined(checked === true)}
            />
            <Label htmlFor="cal-declined" className="text-sm font-normal">
              Include sessions you{"'"}re not able to join
            </Label>
          </div>

          {/* Warning (subscribe only) */}
          {mode === "subscribe" && (
            <div className="flex items-start gap-2 rounded-md border border-status-warning-border bg-status-warning p-3">
              <AlertTriangle className="h-4 w-4 text-status-warning-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-status-warning-foreground">
                This link is personal to your account. Do not share it with others.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {mode === "subscribe" ? (
            <Button onClick={handleSubscribe} disabled={!hasSelection}>
              <Copy className="h-4 w-4" />
              Copy Subscription URL
            </Button>
          ) : (
            <Button onClick={handleDownload} disabled={!hasSelection}>
              <Download className="h-4 w-4" />
              Download .ics
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeTab({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "bg-muted text-foreground hover:bg-accent",
      )}
    >
      {label}
    </button>
  );
}
