"use client";

import { useRef, useState, useTransition } from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableList } from "@/components/ui/draggable-list";
import { Pencil, Trash2, Plus, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getSessionView,
  getAllSessionViews,
  DEFAULT_VIEW_TYPE,
} from "@/components/sports/session/session-views/registry";
import { saveSessionViews } from "@/lib/actions/sessions";
import type { SignupRow } from "@/components/sports/session/session-signups-table";
import type { StoredViewInstance } from "@/lib/supabase/types";
import type { SessionViewEditorHandle } from "@/components/sports/session/session-views/interfaces";

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
 * All changes (reorder, toggle, delete, add, editor data) are local until Save is clicked.
 */
export default function EditViewsDialog({
  sport,
  sessionId,
  signups,
  teamMemberIds,
  viewData,
}: EditViewsDialogProps) {
  const [open, setOpen] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Suppress main dialog close triggered by focus-loss when confirm dialog closes
  const suppressCloseRef = useRef(false);
  // Ref to pull data from the active editor imperatively
  const editorRef = useRef<SessionViewEditorHandle>(null);
  const [step, setStep] = useState<DialogStep>({ kind: "list" });
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);
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
    : [
        { id: 0, type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null, enabled: true },
        ...items,
      ];

  // Track whether local state differs from server state
  const isDirty = JSON.stringify(instances) !== JSON.stringify(viewData);

  /**
   * If we're in the editor step, pull current data from the editor ref
   * and merge it into items. Returns the up-to-date instances array.
   */
  const captureEditorData = (): StoredViewInstance[] => {
    if (step.kind === "edit" && editorRef.current) {
      const data = editorRef.current.getCurrentData();
      const updated = items.map((v) => (v.id === step.viewId ? { ...v, data } : v));
      setItems(updated);
      const hasAtt = updated.some((v) => v.type === DEFAULT_VIEW_TYPE);
      return hasAtt
        ? updated
        : [
            { id: 0, type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null, enabled: true },
            ...updated,
          ];
    }
    return instances;
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      // Ignore close attempts caused by focus-loss after confirm dialog dismissal
      if (suppressCloseRef.current) return;
      // Capture editor data before checking dirty
      const current = captureEditorData();
      const dirty = JSON.stringify(current) !== JSON.stringify(viewData);
      if (dirty) {
        setShowConfirm(true);
        return;
      }
    }
    setOpen(next);
    if (!next) {
      setStep({ kind: "list" });
      setNewName("");
      setItems(viewData);
    }
  };

  const handleDiscard = () => {
    setShowConfirm(false);
    setOpen(false);
    setStep({ kind: "list" });
    setNewName("");
    setItems(viewData);
  };

  const handleConfirmSave = () => {
    setShowConfirm(false);
    handleSave();
  };

  const handleCreate = (type: string) => {
    if (!newName.trim()) return;
    const maxId = instances.length > 0 ? Math.max(...instances.map((v) => v.id)) : -1;
    const newView: StoredViewInstance = { id: maxId + 1, type, label: newName.trim(), data: null };
    setItems(hasAttendance ? [...items, newView] : [...instances, newView]);
    setNewName("");
    setStep({ kind: "edit", viewId: newView.id });
  };

  const handleDelete = (viewId: number) => {
    setItems((prev) => prev.filter((v) => v.id !== viewId));
  };

  const handleToggle = (viewId: number, enabled: boolean) => {
    setItems((prev) => prev.map((v) => (v.id === viewId ? { ...v, enabled } : v)));
  };

  const handleRename = (viewId: number, label: string) => {
    setItems((prev) => prev.map((v) => (v.id === viewId ? { ...v, label } : v)));
  };

  const handleSave = () => {
    // Pull latest editor data if we're in the edit step
    const current = captureEditorData();
    // Reassign ids to reflect current order
    const normalized = current.map((v, i) => ({ ...v, id: i }));
    startTransition(async () => {
      const result = await saveSessionViews(sport, sessionId, normalized);
      if ("success" in result) {
        setOpen(false);
        setStep({ kind: "list" });
      }
    });
  };

  const isAttendanceView = (instance: StoredViewInstance) => instance.type === DEFAULT_VIEW_TYPE;

  // Resolve the active editor entry (used for both dialog sizing and rendering)
  const activeEntry =
    step.kind === "edit"
      ? (() => {
          const inst = instances.find((v) => v.id === step.viewId);
          return inst ? getSessionView(inst.type) : undefined;
        })()
      : undefined;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs h-7">
            <Pencil className="h-3 w-3 mr-1" />
            Edit Views
          </Button>
        </DialogTrigger>
        <DialogContent
          showCloseButton={step.kind !== "edit"}
          className={cn(
            "transition-[max-width] duration-200",
            step.kind === "edit"
              ? cn("sm:max-w-lg overflow-x-auto", activeEntry?.EditorComponent.dialogClassName)
              : "sm:max-w-md",
          )}
        >
          {step.kind === "edit" && (
            <DialogClose className="sticky right-0 top-0 ml-auto w-fit opacity-70 hover:opacity-100 cursor-pointer z-20">
              <X className="size-4" />
              <span className="sr-only">Close</span>
            </DialogClose>
          )}
          <DialogHeader className={step.kind === "edit" ? "sticky -left-6 -mx-6 pl-8 w-fit" : ""}>
            <DialogTitle>
              {step.kind === "list" && "Session Views"}
              {step.kind === "pick-type" && "Choose View Type"}
              {step.kind === "name" &&
                `Name Your ${allTypes.find((t) => t.id === step.type)?.label}`}
              {step.kind === "edit" && instances.find((v) => v.id === step.viewId)?.label}
            </DialogTitle>
            <DialogDescription className="sr-only">Manage session views</DialogDescription>
          </DialogHeader>

          {step.kind === "list" && (
            <div className="space-y-2">
              <DraggableList
                items={instances}
                onReorder={(next) => setItems(next.filter((v) => v.id !== 0 || hasAttendance))}
                keyExtractor={(v) => v.id}
                isDraggable={(v) => editingId !== v.id}
                itemClassName={(v) => {
                  const isEnabled = v.enabled !== false;
                  return !isEnabled ? "bg-muted/50 opacity-50" : "";
                }}
                renderItem={(instance, index) => {
                  const isEnabled = instance.enabled !== false;
                  const isDefault = index === instances.findIndex((v) => v.enabled !== false);
                  return (
                    <>
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => handleToggle(instance.id, e.target.checked)}
                        className="h-4 w-4 rounded border-input shrink-0"
                      />
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {isAttendanceView(instance) ? (
                            <span className="text-sm font-medium truncate">{instance.label}</span>
                          ) : (
                            <input
                              type="text"
                              value={instance.label}
                              onChange={(e) => handleRename(instance.id, e.target.value)}
                              onFocus={() => setEditingId(instance.id)}
                              onBlur={() => setEditingId(null)}
                              className="text-sm font-medium truncate bg-transparent border-none outline-none focus:ring-1 focus:ring-ring rounded px-1 -ml-1 w-full"
                            />
                          )}
                          {isDefault && (
                            <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium text-muted-foreground shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        {!isAttendanceView(instance) && (
                          <span className="text-xs text-muted-foreground">
                            {allTypes.find((t) => t.id === instance.type)?.label ?? instance.type}
                          </span>
                        )}
                      </div>
                      {!isAttendanceView(instance) && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setStep({ kind: "edit", viewId: instance.id })}
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
                    </>
                  );
                }}
              />
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
                  disabled={!newName.trim()}
                >
                  Add
                </Button>
              </div>
            </div>
          )}

          {step.kind === "edit" &&
            (() => {
              const instance = instances.find((v) => v.id === step.viewId);
              if (!instance || !activeEntry) {
                return (
                  <div className="flex items-center gap-3 py-8 justify-center">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading...</span>
                  </div>
                );
              }
              return (
                <div>
                  <div className="-mx-6">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mb-3 text-xs sticky -left-6 pl-8 w-fit"
                      onClick={() => {
                        // Capture editor data before leaving edit mode
                        captureEditorData();
                        setStep({ kind: "list" });
                      }}
                    >
                      ← Back
                    </Button>
                  </div>
                  <activeEntry.EditorComponent
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    viewData={instance.data}
                    ref={editorRef}
                  />
                </div>
              );
            })()}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showConfirm}
        onOpenChange={(next) => {
          setShowConfirm(next);
          if (!next) {
            // Suppress the main dialog's close handler for one tick (focus-loss artifact)
            suppressCloseRef.current = true;
            setTimeout(() => {
              suppressCloseRef.current = false;
            }, 0);
          }
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Unsaved changes</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Would you like to save or discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDiscard}>
              Discard
            </Button>
            <Button onClick={handleConfirmSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
