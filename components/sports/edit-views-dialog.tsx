"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Check, Trash2, Plus } from "lucide-react";
import { getAlternateView, getAllAlternateViews } from "@/components/sports/session-alt-views/registry";
import { createSessionView, deleteSessionView } from "@/lib/actions/sessions";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/components/sports/session-alt-views/interfaces";

interface EditViewsDialogProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    viewData: Record<string, StoredViewInstance>;
}

type DialogStep =
    | { kind: "list" }
    | { kind: "pick-type" }
    | { kind: "name"; type: string }
    | { kind: "edit"; viewId: string };

/**
 * Admin-only dialog for managing alternate view instances on a session.
 * Supports creating multiple instances of the same view type, each with a custom name.
 */
export default function EditViewsDialog({
    sport,
    sessionId,
    signups,
    teamMemberIds,
    viewData,
}: EditViewsDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<DialogStep>({ kind: "list" });
    const [newName, setNewName] = useState("");
    const [isPending, startTransition] = useTransition();

    const allTypes = getAllAlternateViews();
    const instances = Object.entries(viewData);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) {
            setStep({ kind: "list" });
            setNewName("");
        }
    };

    const handleCreate = (type: string) => {
        if (!newName.trim()) return;
        startTransition(async () => {
            const result = await createSessionView(sport, sessionId, type, newName.trim());
            if ("success" in result) {
                setStep({ kind: "edit", viewId: result.viewId });
                setNewName("");
            }
        });
    };

    const handleDelete = (viewId: string) => {
        startTransition(async () => {
            await deleteSessionView(sport, sessionId, viewId);
        });
    };

    const handleSaved = () => {
        setOpen(false);
        setStep({ kind: "list" });
    };

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
                        {step.kind === "list" && "Alternate Views"}
                        {step.kind === "pick-type" && "Choose View Type"}
                        {step.kind === "name" &&
                            `Name Your ${allTypes.find((t) => t.id === step.type)?.label}`}
                        {step.kind === "edit" && viewData[step.viewId]?.label}
                    </DialogTitle>
                </DialogHeader>

                {step.kind === "list" && (
                    <div className="space-y-2">
                        {instances.length === 0 && (
                            <p className="text-sm text-muted-foreground py-2">
                                No alternate views configured yet.
                            </p>
                        )}
                        {instances.map(([id, instance]) => (
                            <div
                                key={id}
                                className="flex items-center justify-between rounded-md border px-4 py-3"
                            >
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">
                                        {instance.label}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {allTypes.find((t) => t.id === instance.type)?.label ??
                                            instance.type}
                                    </span>
                                </div>
                                <div className="flex items-center gap-1">
                                    {instance.data != null && (
                                        <Check className="h-3 w-3 text-muted-foreground mr-1" />
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() =>
                                            setStep({ kind: "edit", viewId: id })
                                        }
                                    >
                                        <Pencil className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(id)}
                                        disabled={isPending}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full mt-2"
                            onClick={() => setStep({ kind: "pick-type" })}
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            Add New View
                        </Button>
                    </div>
                )}

                {step.kind === "pick-type" && (
                    <div className="space-y-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-1 -ml-2 text-xs"
                            onClick={() => setStep({ kind: "list" })}
                        >
                            ← Back
                        </Button>
                        {allTypes.map((type) => (
                            <button
                                key={type.id}
                                onClick={() => setStep({ kind: "name", type: type.id })}
                                className="w-full flex items-center rounded-md border px-4 py-3 text-left hover:bg-muted transition-colors"
                            >
                                <span className="text-sm font-medium">{type.label}</span>
                            </button>
                        ))}
                    </div>
                )}

                {step.kind === "name" && (
                    <div className="space-y-3">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="mb-1 -ml-2 text-xs"
                            onClick={() => setStep({ kind: "pick-type" })}
                        >
                            ← Back
                        </Button>
                        <p className="text-sm text-muted-foreground">
                            Give this view a name (e.g. &quot;Batting Order&quot;).
                        </p>
                        <Input
                            placeholder="View name"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") handleCreate(step.type);
                            }}
                        />
                        <div className="flex justify-end">
                            <Button
                                size="sm"
                                onClick={() => handleCreate(step.type)}
                                disabled={!newName.trim() || isPending}
                            >
                                {isPending ? "Creating…" : "Create"}
                            </Button>
                        </div>
                    </div>
                )}

                {step.kind === "edit" && (() => {
                    const instance = viewData[step.viewId];
                    const entry = instance
                        ? getAlternateView(instance.type)
                        : undefined;
                    if (!entry) {
                        return (
                            <p className="text-sm text-muted-foreground">
                                No editor registered for this view type.
                            </p>
                        );
                    }
                    return (
                        <div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="mb-3 -ml-2 text-xs"
                                onClick={() => setStep({ kind: "list" })}
                            >
                                ← Back
                            </Button>
                            <entry.EditorComponent
                                sport={sport}
                                sessionId={sessionId}
                                viewId={step.viewId}
                                signups={signups}
                                teamMemberIds={teamMemberIds}
                                viewData={instance.data}
                                onSaved={handleSaved}
                            />
                        </div>
                    );
                })()}
            </DialogContent>
        </Dialog>
    );
}
