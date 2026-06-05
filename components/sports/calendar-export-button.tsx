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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { CalendarDays, Copy, Download, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface TabOption {
    value: string;
    label: string;
}

interface CalendarExportButtonProps {
    sport: string;
    userId: string;
    tabs: TabOption[];
}

export default function CalendarExportButton({
    sport,
    userId,
    tabs,
}: CalendarExportButtonProps) {
    const [selectedTab, setSelectedTab] = useState("all");
    const [includeHistory, setIncludeHistory] = useState(false);
    const [open, setOpen] = useState(false);

    function buildUrl(mode: "subscribe" | "download"): string {
        const base = `${window.location.origin}/api/calendar/${sport}`;
        const params = new URLSearchParams();
        params.set("userId", userId);
        params.set("mode", mode);
        if (selectedTab !== "all") params.set("tab", selectedTab);
        if (mode === "download" && includeHistory) params.set("history", "true");
        return `${base}?${params.toString()}`;
    }

    function handleSubscribe() {
        const httpUrl = buildUrl("subscribe");
        const webcalUrl = httpUrl.replace(/^https?:\/\//, "webcal://");
        navigator.clipboard.writeText(webcalUrl).then(() => {
            toast.success("Subscription URL copied to clipboard", {
                description: "Paste this URL in your calendar app to subscribe.",
            });
            setOpen(false);
        });
    }

    function handleDownload() {
        const url = buildUrl("download");
        const a = document.createElement("a");
        a.href = url;
        a.download = `ntcbc-${sport}-sessions.ics`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setOpen(false);
    }

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
                    {/* Session type selection */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Session type</Label>
                        <RadioGroup value={selectedTab} onValueChange={setSelectedTab}>
                            <div className="flex items-center gap-2">
                                <RadioGroupItem value="all" id="cal-all" />
                                <Label htmlFor="cal-all" className="font-normal">All Sessions</Label>
                            </div>
                            {tabs.map((tab) => (
                                <div key={tab.value} className="flex items-center gap-2">
                                    <RadioGroupItem value={tab.value} id={`cal-${tab.value}`} />
                                    <Label htmlFor={`cal-${tab.value}`} className="font-normal">{tab.label}</Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </div>

                    {/* Include history checkbox */}
                    <div className="flex items-center gap-2">
                        <Checkbox
                            id="cal-history"
                            checked={includeHistory}
                            onCheckedChange={(checked) => setIncludeHistory(checked === true)}
                        />
                        <Label htmlFor="cal-history" className="text-sm font-normal">
                            Include past sessions (download only)
                        </Label>
                    </div>

                    {/* Warning */}
                    <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/50">
                        <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-amber-800 dark:text-amber-300">
                            This link is personal to your account. Do not share it with others.
                        </p>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    <Button variant="outline" onClick={handleSubscribe}>
                        <Copy className="h-4 w-4" />
                        Copy Subscription URL
                    </Button>
                    <Button onClick={handleDownload}>
                        <Download className="h-4 w-4" />
                        Download .ics
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
