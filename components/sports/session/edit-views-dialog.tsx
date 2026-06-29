"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormDialog } from "@/components/ui/form-dialog";
import { useConfigurator, type CaptureHandle } from "@/components/ui/configurator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DraggableList } from "@/components/ui/draggable-list";
import { Pencil, Trash2, Plus, Loader2, Lightbulb } from "lucide-react";
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
  const editorRef = useRef<SessionViewEditorHandle>(null);
  const [step, setStep] = useState<DialogStep>({ kind: "list" });

  // Adapter: SessionViewEditorHandle → CaptureHandle.
  // Always non-null — captureMerge already no-ops when step !== "edit".
  const captureRef = useRef<CaptureHandle>({
    getCurrentData: () => editorRef.current?.getCurrentData() ?? null,
  });

  // captureMerge needs access to `step` but must be stable for Configurator's interval.
  // Configurator uses a ref internally for captureMerge, so reference changes are safe.
  const stepRef = useRef(step);
  useEffect(() => {
    stepRef.current = step;
  });

  const captureMerge = (captured: unknown, draft: StoredViewInstance[]): StoredViewInstance[] => {
    const currentStep = stepRef.current;
    if (currentStep.kind !== "edit") return draft;
    return draft.map((v) => (v.id === currentStep.viewId ? { ...v, data: captured } : v));
  };

  const saveRef = useRef<(() => void) | null>(null);

  const handleSaveFromConfirm = () => {
    saveRef.current?.();
  };

  // Compute editor dialog className outside JSX
  const editorDialogClassName =
    step.kind === "edit"
      ? (() => {
          const inst = viewData.find((v) => v.id === step.viewId);
          if (!inst) return undefined;
          const entry = getSessionView(inst.type);
          return entry?.EditorComponent.dialogClassName;
        })()
      : undefined;

  return (
    <FormDialog<StoredViewInstance[]>
      draftKey={`views:${sport}:${sessionId}`}
      serverState={viewData}
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          setStep({ kind: "list" });
        }
      }}
      onSave={handleSaveFromConfirm}
      onDiscard={() => setStep({ kind: "list" })}
      captureRef={captureRef}
      captureMerge={captureMerge}
      showCloseButton
      className={cn(
        "transition-[max-width] duration-200",
        step.kind === "edit"
          ? cn("sm:max-w-lg overflow-x-auto", editorDialogClassName)
          : "sm:max-w-md",
      )}
      trigger={
        <Button variant="outline" size="sm" className="text-xs h-7">
          <Pencil className="h-3 w-3 mr-1" />
          Edit Views
        </Button>
      }
    >
      <EditViewsDialogContent
        sport={sport}
        sessionId={sessionId}
        signups={signups}
        teamMemberIds={teamMemberIds}
        step={step}
        setStep={setStep}
        editorRef={editorRef}
        setOpen={setOpen}
        saveRef={saveRef}
      />
    </FormDialog>
  );
}
function EditViewsDialogContent({
  sport,
  sessionId,
  signups,
  teamMemberIds,
  step,
  setStep,
  editorRef,
  setOpen,
  saveRef,
}: {
  sport: string;
  sessionId: string;
  signups: SignupRow[];
  teamMemberIds: Set<string>;
  step: DialogStep;
  setStep: (step: DialogStep) => void;
  editorRef: React.RefObject<SessionViewEditorHandle | null>;
  setOpen: (open: boolean) => void;
  saveRef: React.MutableRefObject<(() => void) | null>;
}) {
  const {
    draft: items,
    setDraft: setItems,
    updateDraft,
    isDirty,
    save,
  } = useConfigurator<StoredViewInstance[]>();
  const [newName, setNewName] = useState("");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);

  const allTypes = getAllSessionViews();

  // Always show attendance row — synthesize if not in items
  const hasAttendance = items.some((v) => v.type === DEFAULT_VIEW_TYPE);
  const instances = useMemo<StoredViewInstance[]>(
    () =>
      hasAttendance
        ? items
        : [
            { id: 0, type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null, enabled: true },
            ...items,
          ],
    [items, hasAttendance],
  );

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

  const handleCreate = (type: string) => {
    const label = newName.trim() || allTypes.find((t) => t.id === type)?.defaultName || type;
    const maxId = instances.length > 0 ? Math.max(...instances.map((v) => v.id)) : -1;
    const newView: StoredViewInstance = { id: maxId + 1, type, label, data: null };
    setItems(hasAttendance ? [...items, newView] : [...instances, newView]);
    setNewName("");
    setStep({ kind: "edit", viewId: newView.id });
  };

  /** Skip the name step if this is the first view of that type. */
  const handlePickType = (type: string) => {
    const existsAlready = instances.some((v) => v.type === type);
    if (existsAlready) {
      setStep({ kind: "name", type });
    } else {
      handleCreate(type);
    }
  };

  const handleDelete = (viewId: number) => {
    updateDraft((prev) => prev.filter((v) => v.id !== viewId));
  };

  const handleToggle = (viewId: number, enabled: boolean) => {
    updateDraft((prev) => prev.map((v) => (v.id === viewId ? { ...v, enabled } : v)));
  };

  const handleRename = (viewId: number, label: string) => {
    updateDraft((prev) => prev.map((v) => (v.id === viewId ? { ...v, label } : v)));
  };

  const handleSave = () => {
    const current = captureEditorData();
    const normalized = current.map((v, i) => ({ ...v, id: i }));
    startTransition(async () => {
      const result = await saveSessionViews(sport, sessionId, normalized);
      if ("success" in result) {
        save();
        setOpen(false);
        setStep({ kind: "list" });
      }
    });
  };

  // Expose save to parent so FormDialog's confirm "Save" button works
  useEffect(() => {
    saveRef.current = handleSave;
  });

  const isAttendanceView = (instance: StoredViewInstance) => instance.type === DEFAULT_VIEW_TYPE;

  const activeEntry = useMemo(() => {
    if (step.kind !== "edit") return undefined;
    const inst = instances.find((v) => v.id === step.viewId);
    return inst ? getSessionView(inst.type) : undefined;
  }, [step, instances]);

  return (
    <>
      <DialogHeader className={step.kind === "edit" ? "sticky -left-6 -mx-6 pl-8 w-fit" : ""}>
        <DialogTitle>
          {step.kind === "list" && "Session Views"}
          {step.kind === "pick-type" && "Choose View Type"}
          {step.kind === "name" && `Name Your ${allTypes.find((t) => t.id === step.type)?.label}`}
          {step.kind === "edit" && instances.find((v) => v.id === step.viewId)?.label}
        </DialogTitle>
        <DialogDescription className="sr-only">Manage session views</DialogDescription>
      </DialogHeader>

      <div className="text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 flex items-start gap-2">
        <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-0.5" />
        <span>
          Your edits are auto-saved as a <u>draft</u> if you leave
        </span>
      </div>

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
                    aria-label={`Toggle ${instance.label}`}
                    checked={isEnabled}
                    onChange={(e) => handleToggle(instance.id, e.target.checked)}
                    className="h-4 w-4 rounded border-input shrink-0"
                  />
                  <div className="flex flex-col flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isAttendanceView(instance) ? (
                        <span className="text-sm font-medium truncate">{instance.label}</span>
                      ) : (
                        <div className="relative flex items-center min-w-0 flex-1">
                          <input
                            type="text"
                            value={instance.label}
                            onChange={(e) => handleRename(instance.id, e.target.value)}
                            onFocus={() => setEditingId(instance.id)}
                            onBlur={() => setEditingId(null)}
                            className="text-base md:text-sm font-medium truncate bg-transparent outline-none border-b border-dashed border-muted-foreground/30 focus:border-solid focus:border-ring focus:ring-0 rounded-none px-1 -ml-1 w-full"
                          />
                        </div>
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
                onClick={() => handlePickType(type.id)}
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
            <Button size="sm" onClick={() => handleCreate(step.type)} disabled={!newName.trim()}>
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
                    captureEditorData(); // eslint-disable-line react-hooks/refs -- called from event handler, not render
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
    </>
  );
}
