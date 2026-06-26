"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

// ── localStorage helpers ─────────────────────────────────────────

const DRAFT_PREFIX = "configurator:";
const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredDraft<T, M = unknown> {
  draft: T;
  meta?: M;
  savedAt: number;
  serverSnapshot: string;
}

function loadDraft<T, M = unknown>(
  key: string,
  serverState: unknown,
): { draft: T; meta?: M; savedAt: number; stale: boolean } | null {
  try {
    const raw = localStorage.getItem(DRAFT_PREFIX + key);
    if (!raw) return null;
    const stored: StoredDraft<T, M> = JSON.parse(raw);
    if (Date.now() - stored.savedAt > DRAFT_EXPIRY_MS) {
      localStorage.removeItem(DRAFT_PREFIX + key);
      return null;
    }
    const stale = stored.serverSnapshot !== JSON.stringify(serverState);
    return { draft: stored.draft, meta: stored.meta, savedAt: stored.savedAt, stale };
  } catch {
    return null;
  }
}

function persistDraft<T, M = unknown>(key: string, draft: T, serverState: unknown, meta?: M): void {
  try {
    const stored: StoredDraft<T, M> = {
      draft,
      meta,
      savedAt: Date.now(),
      serverSnapshot: JSON.stringify(serverState),
    };
    localStorage.setItem(DRAFT_PREFIX + key, JSON.stringify(stored));
  } catch {
    // localStorage full or unavailable — silently ignore
  }
}

function removeDraft(key: string): void {
  try {
    localStorage.removeItem(DRAFT_PREFIX + key);
  } catch {
    // silently ignore
  }
}

// ── Relative time formatter ──────────────────────────────────────

export function relativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return "yesterday";
}

// ── Types ────────────────────────────────────────────────────────

/** Imperative handle for capturing data from an editor (e.g., Tiptap). */
export interface CaptureHandle {
  getCurrentData: () => unknown;
}

export interface ConfiguratorState<T, M = unknown> {
  draft: T;
  setDraft: (next: T) => void;
  updateDraft: (fn: (prev: T) => T) => void;
  serverState: T;
  isDirty: boolean;
  isStale: boolean;
  restoredAt: number | null;
  meta: M | undefined;
  setMeta: (next: M) => void;
  dismissRestore: () => void;
  save: (newServerState?: T) => void;
  discard: () => void;
  clearStorage: () => void;
}

export interface ConfiguratorProps<T, M = unknown> {
  /** Unique localStorage key for this configurator instance. */
  draftKey: string;
  /** Server/initial state — used as baseline for dirty detection. */
  serverState: T;
  /** Called when isDirty transitions (for cross-component awareness). */
  onDirtyChange?: (isDirty: boolean) => void;
  /** Optional imperative ref for capturing editor data before persist. */
  captureRef?: RefObject<CaptureHandle | null>;
  /** Merge captured data into draft. Required if captureRef is provided. */
  captureMerge?: (captured: unknown, currentDraft: T) => T;
  /** Initial meta state (persisted alongside draft). */
  meta?: M;
  children: ReactNode;
}

// ── Context ──────────────────────────────────────────────────────

const ConfiguratorContext = createContext<ConfiguratorState<unknown, unknown> | null>(null);

export function useConfigurator<T, M = unknown>(): ConfiguratorState<T, M> {
  const ctx = useContext(ConfiguratorContext);
  if (!ctx) {
    throw new Error("useConfigurator must be used within a <Configurator> provider");
  }
  return ctx as unknown as ConfiguratorState<T, M>;
}

// ── Component ────────────────────────────────────────────────────

export function Configurator<T, M = unknown>({
  draftKey,
  serverState,
  onDirtyChange,
  captureRef,
  captureMerge,
  meta: initialMeta,
  children,
}: ConfiguratorProps<T, M>) {
  // Always initialize from serverState for SSR/hydration safety.
  // localStorage restoration happens in a mount effect below.
  const [draft, setDraftRaw] = useState<T>(serverState);
  const [meta, setMeta] = useState<M | undefined>(initialMeta);
  const [restoredAt, setRestoredAt] = useState<number | null>(null);
  const [isStale, setIsStale] = useState<boolean>(false);

  // ── Restore from localStorage on mount ─────────────────────────
  const didRestoreRef = useRef(false);
  useEffect(() => {
    if (didRestoreRef.current) return;
    didRestoreRef.current = true;
    const stored = loadDraft<T, M>(draftKey, serverState);
    if (!stored) return;
    if (JSON.stringify(stored.draft) === JSON.stringify(serverState)) {
      removeDraft(draftKey);
      return;
    }
    setDraftRaw(stored.draft);
    if (stored.meta !== undefined) setMeta(stored.meta);
    setRestoredAt(stored.savedAt);
    setIsStale(stored.stale);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Internal baseline — starts from serverState, updated by save()
  const [baseline, setBaseline] = useState<T>(serverState);

  const isDirty = JSON.stringify(draft) !== JSON.stringify(baseline);

  // Refs to avoid stale closures
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const baselineRef = useRef(baseline);
  baselineRef.current = baseline;
  const metaRef = useRef(meta);
  metaRef.current = meta;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevDirtyRef = useRef(isDirty);

  // ── Setters ────────────────────────────────────────────────────
  const setDraft = useCallback((next: T) => {
    setDraftRaw(next);
  }, []);

  const updateDraft = useCallback((fn: (prev: T) => T) => {
    setDraftRaw(fn);
  }, []);

  // ── Sync when serverState prop changes externally ─────────────
  const prevServerStateRef = useRef(serverState);
  useEffect(() => {
    const prevJson = JSON.stringify(prevServerStateRef.current);
    const nextJson = JSON.stringify(serverState);
    if (prevJson === nextJson) return;
    prevServerStateRef.current = serverState;

    if (!isDirty) {
      // Not dirty: stay in sync with server
      setDraftRaw(serverState);
      setBaseline(serverState);
      setRestoredAt(null);
      removeDraft(draftKey);
    } else {
      // Dirty: mark as stale (baseline shifted under them)
      setBaseline(serverState);
      setIsStale(true);
    }
  }, [serverState, isDirty, draftKey]);

  // ── Debounced localStorage persist ─────────────────────────────
  useEffect(() => {
    if (!isDirty) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      persistDraft(draftKey, draftRef.current, baselineRef.current, metaRef.current);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isDirty, draft, draftKey, serverState]);

  // ── captureRef interval ────────────────────────────────────────
  const captureMergeRef = useRef(captureMerge);
  captureMergeRef.current = captureMerge;

  useEffect(() => {
    if (!captureRef || !captureMerge) return;

    const id = setInterval(() => {
      const handle = captureRef.current;
      if (!handle) return;
      let captured: unknown;
      try {
        captured = handle.getCurrentData();
      } catch {
        return;
      }
      if (captured == null) return;
      const merge = captureMergeRef.current;
      if (!merge) return;
      const merged = merge(captured, draftRef.current);
      if (JSON.stringify(merged) !== JSON.stringify(draftRef.current)) {
        setDraftRaw(merged);
      }
    }, 2000);

    return () => clearInterval(id);
  }, [captureRef, !!captureMerge]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── onDirtyChange callback ─────────────────────────────────────
  useEffect(() => {
    if (prevDirtyRef.current !== isDirty) {
      prevDirtyRef.current = isDirty;
      onDirtyChange?.(isDirty);
    }
  }, [isDirty, onDirtyChange]);

  // ── Clean up localStorage when no longer dirty ─────────────────
  useEffect(() => {
    if (!isDirty) {
      removeDraft(draftKey);
    }
  }, [isDirty, draftKey]);

  // ── Actions ────────────────────────────────────────────────────
  const dismissRestore = useCallback(() => {
    setRestoredAt(null);
    setIsStale(false);
  }, []);

  const save = useCallback(
    (newServerState?: T) => {
      const nextBaseline = newServerState ?? draftRef.current;
      setDraftRaw(nextBaseline);
      setBaseline(nextBaseline);
      setRestoredAt(null);
      setIsStale(false);
      removeDraft(draftKey);
    },
    [draftKey],
  );

  const discard = useCallback(() => {
    setDraftRaw(baseline);
    setMeta(initialMeta);
    setRestoredAt(null);
    setIsStale(false);
    removeDraft(draftKey);
  }, [baseline, initialMeta, draftKey]);

  const clearStorage = useCallback(() => {
    removeDraft(draftKey);
  }, [draftKey]);

  // ── Context value ──────────────────────────────────────────────
  const value = useMemo<ConfiguratorState<T, M>>(
    () => ({
      draft,
      setDraft,
      updateDraft,
      serverState: baseline,
      isDirty,
      isStale,
      restoredAt,
      meta,
      setMeta,
      dismissRestore,
      save,
      discard,
      clearStorage,
    }),
    [
      draft,
      setDraft,
      updateDraft,
      baseline,
      isDirty,
      isStale,
      restoredAt,
      meta,
      setMeta,
      dismissRestore,
      save,
      discard,
      clearStorage,
    ],
  );

  return (
    <ConfiguratorContext.Provider value={value as unknown as ConfiguratorState<unknown, unknown>}>
      {children}
    </ConfiguratorContext.Provider>
  );
}

// ── Restore banner ───────────────────────────────────────────────

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { statusColors } from "@/lib/styles";

/**
 * Renders a banner when a draft has been restored from localStorage.
 * Must be used inside a <Configurator> provider.
 */
export function RestoreBanner() {
  const { restoredAt, isStale, dismissRestore } = useConfigurator();
  if (restoredAt === null) return null;
  const palette = statusColors.info;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
        palette.bg,
        palette.text,
        palette.border,
      )}
    >
      <span>
        {isStale
          ? `Restored draft from ${relativeTime(restoredAt)} (data may have changed)`
          : `Restored unsaved changes from ${relativeTime(restoredAt)}`}
      </span>
      <Button
        variant="ghost"
        size="sm"
        className="h-5 px-2 text-[11px] font-medium"
        onClick={dismissRestore}
      >
        Dismiss
      </Button>
    </div>
  );
}
