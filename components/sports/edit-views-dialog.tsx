"use client";

import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Pencil, Check } from "lucide-react";
import { getAlternateView } from "@/config/alternate-view-registry";
import type { AlternateViewMeta } from "@/config/config-interfaces";
import type { SignupRow } from "@/components/sports/session-signups-table";

interface EditViewsDialogProps {
    sport: string;
    sessionId: string;
    views: AlternateViewMeta[];
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    viewData: Record<string, unknown>;
}

/**
 * Admin-only dialog: "Create/Edit Views" button opens a two-step dialog.
 * Step 1: Pick which view type to create/edit.
 * Step 2: Show the editor for that view type.
 */
export default function EditViewsDialog({
    sport,
    sessionId,
    views,
    signups,
    teamMemberIds,
    viewData,
}: EditViewsDialogProps) {
    const [open, setOpen] = useState(false);
    const [selectedView, setSelectedView] = useState<string | null>(null);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) setSelectedView(null);
    };

    const handleSaved = () => {
        setOpen(false);
        setSelectedView(null);
    };

    const entry = selectedView ? getAlternateView(selectedView) : null;
    const selectedMeta = views.find((v) => v.id === selectedView);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-7">
                    <Pencil className="h-3 w-3 mr-1" />
                    Edit Views
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {selectedView ? selectedMeta?.label : "Edit Views"}
                    </DialogTitle>
                </DialogHeader>

                {!selectedView ? (
                    <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">
                            Choose a view to create or edit.
                        </p>
                        {views.map((view) => {
                            const isConfigured = viewData[view.id] != null;
                            return (
                                <button
                                    key={view.id}
                                    onClick={() => setSelectedView(view.id)}
                                    className="w-full flex items-center justify-between rounded-md border px-4 py-3 text-left hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-medium">{view.label}</span>
                                    {isConfigured && (
                                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                            <Check className="h-3 w-3" />
                                            Configured
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ) : entry ? (
                    <div>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-3 -ml-2 text-xs"
                            onClick={() => setSelectedView(null)}
                        >
                            ← Back
                        </Button>
                        <entry.EditorComponent
                            sport={sport}
                            sessionId={sessionId}
                            viewId={selectedView}
                            signups={signups}
                            teamMemberIds={teamMemberIds}
                            viewData={viewData[selectedView] ?? null}
                            onSaved={handleSaved}
                        />
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">
                        No editor registered for this view type.
                    </p>
                )}
            </DialogContent>
        </Dialog>
    );
}
