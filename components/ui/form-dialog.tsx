"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
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
import {
  Configurator,
  useConfigurator,
  RestoreBanner,
  type CaptureHandle,
  type ConfiguratorState,
} from "@/components/ui/configurator";

// ── FormDialog props ─────────────────────────────────────────────

export interface FormDialogProps<T, M = unknown> {
  /** Unique localStorage key for this dialog instance. */
  draftKey: string;
  /** Server/initial state — baseline for dirty detection. */
  serverState: T;
  /** Whether the dialog is open (controlled). */
  open: boolean;
  /** Called when open state should change. */
  onOpenChange: (open: boolean) => void;
  /** Called when save is confirmed from the unsaved-changes dialog. When omitted, only Discard/Cancel are shown. */
  onSave?: () => void;
  /** Called when discard is confirmed. */
  onDiscard?: () => void;
  /** Optional imperative ref for capturing editor data. */
  captureRef?: RefObject<CaptureHandle | null>;
  /** Merge captured data into draft. Required if captureRef is provided. */
  captureMerge?: (captured: unknown, currentDraft: T) => T;
  /** Initial meta state for multi-step dialogs. */
  meta?: M;
  /** Additional className for DialogContent. */
  className?: string;
  /** Whether to show the close X button. Default true. */
  showCloseButton?: boolean;
  /** Dialog trigger element. */
  trigger?: ReactNode;
  /** Dialog body — ReactNode or render prop receiving configurator state for inline draft access. */
  children: ReactNode | ((state: ConfiguratorState<T, M>) => ReactNode);
}

// ── Inner dialog (has access to Configurator context) ────────────

interface InnerDialogProps<T, M> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
  onDiscard?: () => void;
  captureRef?: RefObject<CaptureHandle | null>;
  captureMerge?: (captured: unknown, currentDraft: T) => T;
  className?: string;
  showCloseButton: boolean;
  trigger?: ReactNode;
  children: ReactNode | ((state: ConfiguratorState<T, M>) => ReactNode);
}

function InnerDialog<T, M>({
  open,
  onOpenChange,
  onSave,
  onDiscard,
  captureRef,
  captureMerge,
  className,
  showCloseButton,
  trigger,
  children,
}: InnerDialogProps<T, M>) {
  const state = useConfigurator<T, M>();
  const { draft, serverState: baseline, restoredAt, discard, clearStorage } = state;
  const [showConfirm, setShowConfirm] = useState(false);
  const suppressCloseRef = useRef(false);
  const hasAutoOpenedRef = useRef(false);

  // Auto-open dialog when a draft is restored from localStorage
  useEffect(() => {
    if (restoredAt !== null && !open && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      onOpenChange(true);
    }
  }, [restoredAt, open, onOpenChange]);

  // Get current draft with imperative capture
  const getCurrentDraft = useCallback((): T => {
    if (captureRef?.current && captureMerge) {
      try {
        const captured = captureRef.current.getCurrentData();
        if (captured != null) return captureMerge(captured, draft);
      } catch {
        /* editor unmounted */
      }
    }
    return draft;
  }, [captureRef, captureMerge, draft]);

  // Close interceptor — check dirty before allowing close
  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        if (suppressCloseRef.current) return;
        const current = getCurrentDraft();
        if (JSON.stringify(current) !== JSON.stringify(baseline)) {
          setShowConfirm(true);
          return;
        }
        clearStorage();
      }
      onOpenChange(next);
    },
    [getCurrentDraft, baseline, onOpenChange, clearStorage],
  );

  const handleConfirmDiscard = useCallback(() => {
    suppressCloseRef.current = true;
    setTimeout(() => {
      suppressCloseRef.current = false;
    }, 0);
    setShowConfirm(false);
    discard();
    onOpenChange(false);
    onDiscard?.();
  }, [discard, onOpenChange, onDiscard]);

  const handleConfirmSave = useCallback(() => {
    suppressCloseRef.current = true;
    setTimeout(() => {
      suppressCloseRef.current = false;
    }, 0);
    setShowConfirm(false);
    onSave?.();
  }, [onSave]);

  const handleConfirmOpenChange = useCallback((next: boolean) => {
    setShowConfirm(next);
    if (!next) {
      suppressCloseRef.current = true;
      setTimeout(() => {
        suppressCloseRef.current = false;
      }, 0);
    }
  }, []);

  // ── Confirm dialog ─────────────────────────────────────────────
  const confirmDialog = (
    <Dialog open={showConfirm} onOpenChange={handleConfirmOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Unsaved changes</DialogTitle>
          <DialogDescription>
            Your unsaved changes will be lost if you discard them.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="destructive" onClick={handleConfirmDiscard}>
            Discard
          </Button>
          {onSave && <Button onClick={handleConfirmSave}>Save</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent showCloseButton={showCloseButton} className={className}>
          <RestoreBanner />
          {typeof children === "function" ? children(state) : children}
        </DialogContent>
      </Dialog>
      {confirmDialog}
    </>
  );
}

// ── FormDialog (public API) ──────────────────────────────────────

export function FormDialog<T, M = unknown>({
  draftKey,
  serverState,
  open,
  onOpenChange,
  onSave,
  onDiscard,
  captureRef,
  captureMerge,
  meta,
  className,
  showCloseButton = true,
  trigger,
  children,
}: FormDialogProps<T, M>) {
  return (
    <Configurator<T, M>
      draftKey={draftKey}
      serverState={serverState}
      captureRef={captureRef}
      captureMerge={captureMerge}
      meta={meta}
    >
      <InnerDialog<T, M>
        open={open}
        onOpenChange={onOpenChange}
        onSave={onSave}
        onDiscard={onDiscard}
        captureRef={captureRef}
        captureMerge={captureMerge}
        className={className}
        showCloseButton={showCloseButton}
        trigger={trigger}
      >
        {children}
      </InnerDialog>
    </Configurator>
  );
}
