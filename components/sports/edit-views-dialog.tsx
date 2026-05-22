"use client";

import { useState, useTransition } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Trash2, Plus, GripVertical, Loader2 } from "lucide-react";
import { getSessionView, getAllSessionViews, DEFAULT_VIEW_TYPE } from "@/components/sports/session-views/registry";
import { saveSessionViews } from "@/lib/actions/sessions";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";

interface EditViewsDialogProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    viewData: StoredViewInstance[];
}

type DialogStep =
    | { kind: "list" }
    | { kind: "pick-type" }
    | { kind: "name"; type: string }
    | { kind: "edit"; viewId: number };

/**
 * Admin-only dialog for managing session view instances.
 * All list changes (reorder, toggle, delete, add) are local until Save is clicked.
 * Custom view editors still open and save their data independently.
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
    const [items, setItems] = useState<StoredViewInstance[]>(viewData);

    // Sync local items when viewData changes (after server revalidation)
    const [prevViewData, setPrevViewData] = useState(viewData);
    if (viewData !== prevViewData) {
        setPrevViewData(viewData);
        setItems(viewData);
    }

    const allTypes = getAllSessionViews();

    // Always show attendance row — synthesize if not in items
    const hasAttendance = items.some((v) => v.type === DEFAULT_VIEW_TYPE);
    const instances: StoredViewInstance[] = hasAttendance
        ? items
        : [{ id: 0, type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null, enabled: true }, ...items];

    // Track whether local state differs from server state
    const isDirty = JSON.stringify(instances) !== JSON.stringify(viewData);

    const handleOpenChange = (next: boolean) => {
        setOpen(next);
        if (!next) {
            setStep({ kind: "list" });
            setNewName("");
            // Reset local state on close without saving
            setItems(viewData);
        }
    };

    const handleCreate = (type: string) => {
        if (!newName.trim()) return;
        const maxId = instances.length > 0 ? Math.max(...instances.map((v) => v.id)) : -1;
        const newView: StoredViewInstance = { id: maxId + 1, type, label: newName.trim(), data: null };
        setItems(hasAttendance ? [...items, newView] : [...instances, newView]);
        setNewName("");
        setStep({ kind: "list" });
    };

    const handleDelete = (viewId: number) => {
        setItems((prev) => prev.filter((v) => v.id !== viewId));
    };

    const handleToggle = (viewId: number, enabled: boolean) => {
        setItems((prev) =>
            prev.map((v) => (v.id === viewId ? { ...v, enabled } : v)),
        );
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index) return;
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(dragIndex, 1);
            next.splice(index, 0, moved);
            return next;
        });
        setDragIndex(index);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    const handleSave = () => {
        // Reassign ids to reflect current order
        const normalized = instances.map((v, i) => ({ ...v, id: i }));
        startTransition(async () => {
            const result = await saveSessionViews(sport, sessionId, normalized);
            if ("success" in result) {
                setOpen(false);
                setStep({ kind: "list" });
            }
        });
    };

    const handleEditorChange = (viewId: number, data: unknown) => {
        setItems((prev) =>
            prev.map((v) => (v.id === viewId ? { ...v, data } : v)),
        );
    };

    const isAttendanceView = (instance: StoredViewInstance) =>
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
                        {step.kind === "edit" && instances.find((v) => v.id === step.viewId)?.label}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        Manage session views
                    </DialogDescription>
                </DialogHeader>

                {step.kind === "list" && (
                    <div className="space-y-2">
                        {instances.map((instance, index) => {
                            const isEnabled = instance.enabled !== false;
                            const isDefault = index === instances.findIndex((v) => v.enabled !== false);
                            return (
                                <div
                                    key={instance.id}
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
                                    <input
                                        type="checkbox"
                                        checked={isEnabled}
                                        onChange={(e) =>
                                            handleToggle(instance.id, e.target.checked)
                                        }
                                        className="h-4 w-4 rounded border-input shrink-0"
                                    />
                                    <div className="flex flex-col flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium truncate">
                                                {instance.label}
                                            </span>
                                            {isDefault && (
                                                <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                                    Default
                                                </span>
                                            )}
                                        </div>
                                        {!isAttendanceView(instance) && (
                                            <span className="text-xs text-muted-foreground">
                                                {allTypes.find((t) => t.id === instance.type)
                                                    ?.label ?? instance.type}
                                            </span>
                                        )}
                                    </div>
                                    {!isAttendanceView(instance) && (
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0"
                                                onClick={() =>
                                                    setStep({ kind: "edit", viewId: instance.id })
                                                }
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                onClick={() => handleDelete(instance.id)}
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
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
                        <Button
                            size="sm"
                            className="w-full"
                            onClick={handleSave}
                            disabled={!isDirty || isPending}
                        >
                            {isPending ? "Saving…" : "Save"}
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
                                disabled={!newName.trim()}
                            >
                                Add
                            </Button>
                        </div>
                    </div>
                )}

                {step.kind === "edit" && (() => {
                    const instance = instances.find((v) => v.id === step.viewId);
                    const entry = instance
                        ? getSessionView(instance.type)
                        : undefined;
                    if (!instance || !entry) {
                        return (
                            <div className="flex items-center gap-3 py-8 justify-center">
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                <span className="text-sm text-muted-foreground">Loading...</span>
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
                                signups={signups}
                                teamMemberIds={teamMemberIds}
                                viewData={instance.data}
                                onChange={(data) => handleEditorChange(instance.id, data)}
                            />
                        </div>
                    );
                })()}
            </DialogContent>
        </Dialog>
    );
}
