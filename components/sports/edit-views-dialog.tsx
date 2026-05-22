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
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react";
import { getSessionView, getAllSessionViews, DEFAULT_VIEW_TYPE } from "@/components/sports/session-views/registry";
import {
    createSessionView,
    deleteSessionView,
    toggleSessionView,
    reorderSessionViews,
} from "@/lib/actions/sessions";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";

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
 * Admin-only dialog for managing session view instances.
 * The attendance view is treated specially: toggle on/off, no rename/delete.
 * Custom views can be created, edited, reordered, and deleted.
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
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const allTypes = getAllSessionViews();

    // Always show attendance row — synthesize if not in viewData
    const hasAttendance = Object.values(viewData).some(
        (v) => v.type === DEFAULT_VIEW_TYPE,
    );
    const instances: [string, StoredViewInstance][] = hasAttendance
        ? Object.entries(viewData)
        : [
              ["attendance", { type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null, enabled: true }],
              ...Object.entries(viewData),
          ];

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

    const handleToggle = (viewId: string, enabled: boolean) => {
        startTransition(async () => {
            await toggleSessionView(sport, sessionId, viewId, enabled);
        });
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) {
            // Visual reorder will be reflected after save
            const keys = instances.map(([id]) => id);
            const [moved] = keys.splice(dragIndex, 1);
            keys.splice(index, 0, moved);
            setDragIndex(index);
            startTransition(async () => {
                await reorderSessionViews(sport, sessionId, keys);
            });
        }
    };

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    const handleSaved = () => {
        setOpen(false);
        setStep({ kind: "list" });
    };

    const isAttendance = (instance: StoredViewInstance) =>
        instance.type === DEFAULT_VIEW_TYPE;

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
                        {step.kind === "list" && "Session Views"}
                        {step.kind === "pick-type" && "Choose View Type"}
                        {step.kind === "name" &&
                            `Name Your ${allTypes.find((t) => t.id === step.type)?.label}`}
                        {step.kind === "edit" && viewData[step.viewId]?.label}
                    </DialogTitle>
                </DialogHeader>

                {step.kind === "list" && (
                    <div className="space-y-2">
                        {instances.map(([id, instance], index) => {
                            const isDefault = isAttendance(instance);
                            const isEnabled = instance.enabled !== false;
                            return (
                                <div
                                    key={id}
                                    draggable
                                    onDragStart={() => handleDragStart(index)}
                                    onDragOver={(e) => handleDragOver(e, index)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-2 rounded-md border px-3 py-3 cursor-grab active:cursor-grabbing transition-colors ${
                                        dragIndex === index
                                            ? "bg-muted border-primary"
                                            : !isEnabled
                                              ? "bg-muted/50 opacity-50"
                                              : ""
                                    }`}
                                >
                                    <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />

                                    {isDefault ? (
                                        <>
                                            <input
                                                type="checkbox"
                                                checked={isEnabled}
                                                onChange={(e) =>
                                                    handleToggle(id, e.target.checked)
                                                }
                                                disabled={isPending}
                                                className="h-4 w-4 rounded border-input shrink-0"
                                            />
                                            <span className="text-sm font-medium flex-1">
                                                Attendance
                                            </span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex flex-col flex-1 min-w-0">
                                                <span className="text-sm font-medium truncate">
                                                    {instance.label}
                                                </span>
                                                <span className="text-xs text-muted-foreground">
                                                    {allTypes.find((t) => t.id === instance.type)
                                                        ?.label ?? instance.type}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 shrink-0">
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
                                        </>
                                    )}
                                </div>
                            );
                        })}
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
                        {allTypes
                            .filter((t) => t.id !== DEFAULT_VIEW_TYPE)
                            .map((type) => (
                                <button
                                    key={type.id}
                                    onClick={() =>
                                        setStep({ kind: "name", type: type.id })
                                    }
                                    className="w-full flex items-center rounded-md border px-4 py-3 text-left hover:bg-muted transition-colors"
                                >
                                    <span className="text-sm font-medium">
                                        {type.label}
                                    </span>
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
                        ? getSessionView(instance.type)
                        : undefined;
                    if (!instance || !entry) {
                        return (
                            <div className="flex items-center justify-center py-8">
                                <p className="text-sm text-muted-foreground">Loading…</p>
                            </div>
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
