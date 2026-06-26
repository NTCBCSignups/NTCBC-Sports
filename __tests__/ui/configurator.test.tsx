// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";
import { createElement, useState } from "react";
import {
  Configurator,
  useConfigurator,
  relativeTime,
  type ConfiguratorProps,
} from "@/components/ui/configurator";

// ── Helpers ──────────────────────────────────────────────────────

const DRAFT_PREFIX = "configurator:";

function getStored<T>(key: string): { draft: T; savedAt: number; serverSnapshot: string } | null {
  const raw = localStorage.getItem(DRAFT_PREFIX + key);
  if (!raw) return null;
  return JSON.parse(raw);
}

function seedStorage<T>(key: string, draft: T, serverState: T, savedAt = Date.now()) {
  localStorage.setItem(
    DRAFT_PREFIX + key,
    JSON.stringify({ draft, savedAt, serverSnapshot: JSON.stringify(serverState) }),
  );
}

/** Test consumer that exposes Configurator state via data attributes. */
function TestConsumer({
  onState,
}: {
  onState?: (state: ReturnType<typeof useConfigurator<{ value: string }>>) => void;
}) {
  const state = useConfigurator<{ value: string }>();
  onState?.(state);
  return createElement("div", {
    "data-testid": "consumer",
    "data-dirty": String(state.isDirty),
    "data-draft": JSON.stringify(state.draft),
    "data-restored": state.restoredAt !== null ? "true" : "false",
    "data-stale": String(state.isStale),
  });
}

function renderConfigurator(
  serverState: { value: string },
  key = "test",
  props: Record<string, unknown> = {},
) {
  let stateRef: ReturnType<typeof useConfigurator<{ value: string }>> | undefined;
  const result = render(
    createElement(
      Configurator as React.ComponentType<ConfiguratorProps<{ value: string }>>,
      { draftKey: key, serverState, ...props } as ConfiguratorProps<{ value: string }>,
      createElement(TestConsumer, {
        onState: (s: ReturnType<typeof useConfigurator<{ value: string }>>) => {
          stateRef = s;
        },
      }),
    ),
  );
  return { ...result, getState: () => stateRef! };
}

// ── Setup ────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.useFakeTimers({ shouldAdvanceTime: true });
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// ── Tests ────────────────────────────────────────────────────────

describe("Configurator", () => {
  describe("initial state", () => {
    it("initializes draft from serverState when no stored draft", () => {
      const { getState } = renderConfigurator({ value: "hello" });
      expect(getState().draft).toEqual({ value: "hello" });
      expect(getState().isDirty).toBe(false);
      expect(getState().restoredAt).toBeNull();
    });

    it("restores draft from localStorage on mount", async () => {
      seedStorage("test", { value: "saved" }, { value: "server" });
      const { getState } = renderConfigurator({ value: "server" });
      // Restoration is deferred to useEffect for SSR/hydration safety
      await act(async () => {});
      expect(getState().draft).toEqual({ value: "saved" });
      expect(getState().isDirty).toBe(true);
      expect(getState().restoredAt).not.toBeNull();
    });

    it("discards stored draft that matches serverState", async () => {
      seedStorage("test", { value: "same" }, { value: "same" });
      const { getState } = renderConfigurator({ value: "same" });
      await act(async () => {});
      expect(getState().draft).toEqual({ value: "same" });
      expect(getState().isDirty).toBe(false);
      expect(getState().restoredAt).toBeNull();
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
    });
  });

  describe("dirty detection", () => {
    it("reports isDirty when draft differs from serverState", () => {
      const { getState } = renderConfigurator({ value: "initial" });
      act(() => getState().setDraft({ value: "changed" }));
      expect(getState().isDirty).toBe(true);
    });

    it("reports not dirty when draft matches serverState", () => {
      const { getState } = renderConfigurator({ value: "initial" });
      act(() => getState().setDraft({ value: "changed" }));
      act(() => getState().setDraft({ value: "initial" }));
      expect(getState().isDirty).toBe(false);
    });
  });

  describe("localStorage persistence", () => {
    it("persists draft to localStorage after debounce when dirty", () => {
      const { getState } = renderConfigurator({ value: "server" });
      act(() => getState().setDraft({ value: "edited" }));
      // Before debounce fires
      expect(getStored("test")).toBeNull();
      // After 500ms debounce
      act(() => vi.advanceTimersByTime(500));
      const stored = getStored<{ value: string }>("test");
      expect(stored).not.toBeNull();
      expect(stored!.draft).toEqual({ value: "edited" });
    });

    it("does not persist when draft equals serverState", () => {
      const { getState } = renderConfigurator({ value: "same" });
      act(() => getState().setDraft({ value: "same" }));
      act(() => vi.advanceTimersByTime(500));
      expect(getStored("test")).toBeNull();
    });
  });

  describe("24h expiry", () => {
    it("discards stored draft older than 24 hours", async () => {
      const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      seedStorage("test", { value: "old" }, { value: "server" }, oldTimestamp);
      const { getState } = renderConfigurator({ value: "server" });
      await act(async () => {});
      expect(getState().draft).toEqual({ value: "server" });
      expect(getState().restoredAt).toBeNull();
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
    });
  });

  describe("stale detection", () => {
    it("marks as stale when stored draft has different serverSnapshot", async () => {
      seedStorage("test", { value: "edited" }, { value: "old-server" });
      const { getState } = renderConfigurator({ value: "new-server" });
      await act(async () => {});
      expect(getState().isStale).toBe(true);
    });

    it("not stale when serverSnapshot matches current serverState", async () => {
      seedStorage("test", { value: "edited" }, { value: "server" });
      const { getState } = renderConfigurator({ value: "server" });
      await act(async () => {});
      expect(getState().isStale).toBe(false);
    });
  });

  describe("save()", () => {
    it("updates baseline and clears localStorage", () => {
      const { getState } = renderConfigurator({ value: "server" });
      act(() => getState().setDraft({ value: "edited" }));
      act(() => vi.advanceTimersByTime(500));
      expect(getStored("test")).not.toBeNull();

      act(() => getState().save());
      expect(getState().isDirty).toBe(false);
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
    });
  });

  describe("discard()", () => {
    it("resets draft to serverState and clears localStorage", () => {
      const { getState } = renderConfigurator({ value: "server" });
      act(() => getState().setDraft({ value: "edited" }));
      act(() => vi.advanceTimersByTime(500));

      act(() => getState().discard());
      expect(getState().draft).toEqual({ value: "server" });
      expect(getState().isDirty).toBe(false);
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
    });
  });

  describe("dismissRestore()", () => {
    it("clears restoredAt", async () => {
      seedStorage("test", { value: "saved" }, { value: "server" });
      const { getState } = renderConfigurator({ value: "server" });
      await act(async () => {});
      expect(getState().restoredAt).not.toBeNull();

      act(() => getState().dismissRestore());
      expect(getState().restoredAt).toBeNull();
    });
  });

  describe("updateDraft()", () => {
    it("applies updater function to draft", () => {
      const { getState } = renderConfigurator({ value: "hello" });
      act(() => getState().updateDraft((prev) => ({ value: prev.value + " world" })));
      expect(getState().draft).toEqual({ value: "hello world" });
    });
  });

  describe("onDirtyChange", () => {
    it("calls onDirtyChange when dirty state transitions", () => {
      const onDirtyChange = vi.fn();
      const { getState } = renderConfigurator({ value: "server" }, "test", { onDirtyChange });

      act(() => getState().setDraft({ value: "changed" }));
      expect(onDirtyChange).toHaveBeenCalledWith(true);

      act(() => getState().discard());
      expect(onDirtyChange).toHaveBeenCalledWith(false);
    });
  });

  describe("clearStorage()", () => {
    it("removes draft from localStorage", () => {
      seedStorage("test", { value: "draft" }, { value: "server" });
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).not.toBeNull();
      localStorage.removeItem(DRAFT_PREFIX + "test");
      expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
    });
  });
});

describe("relativeTime", () => {
  it("returns 'just now' for recent timestamps", () => {
    expect(relativeTime(Date.now() - 5000)).toBe("just now");
  });

  it("returns minutes for timestamps < 1 hour", () => {
    expect(relativeTime(Date.now() - 5 * 60 * 1000)).toBe("5m ago");
  });

  it("returns hours for timestamps < 24 hours", () => {
    expect(relativeTime(Date.now() - 3 * 60 * 60 * 1000)).toBe("3h ago");
  });

  it("returns 'yesterday' for timestamps >= 24 hours", () => {
    expect(relativeTime(Date.now() - 25 * 60 * 60 * 1000)).toBe("yesterday");
  });
});

describe("useConfigurator outside provider", () => {
  it("throws when used outside Configurator", () => {
    expect(() => {
      render(createElement(TestConsumer));
    }).toThrow("useConfigurator must be used within a <Configurator> provider");
  });
});

// ── Edit scenario matrix ─────────────────────────────────────────

describe("edit scenarios (dirty ↔ clean × populate/clear)", () => {
  // ── Fresh (non-dirty) → populate → dirty ───────────────────────

  it("fresh → populate field → becomes dirty, persists to localStorage", () => {
    const { getState } = renderConfigurator({ value: "" });
    expect(getState().isDirty).toBe(false);

    act(() => getState().setDraft({ value: "typed text" }));
    expect(getState().isDirty).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    const stored = getStored<{ value: string }>("test");
    expect(stored).not.toBeNull();
    expect(stored!.draft).toEqual({ value: "typed text" });
  });

  // ── Dirty → clear field → non-dirty ───────────────────────────

  it("dirty → clear field back to server value → becomes clean, localStorage removed", () => {
    const { getState } = renderConfigurator({ value: "" });

    act(() => getState().setDraft({ value: "typed text" }));
    act(() => vi.advanceTimersByTime(500));
    expect(getStored("test")).not.toBeNull();

    act(() => getState().setDraft({ value: "" }));
    expect(getState().isDirty).toBe(false);

    // Clean-up effect fires synchronously in test
    expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();
  });

  // ── Restored draft → clear field → still dirty ────────────────

  it("restored draft → clear one field → still dirty, localStorage updated", async () => {
    seedStorage("multi", { value: "restored-text" }, { value: "" });
    const { getState } = renderConfigurator({ value: "" }, "multi");
    await act(async () => {}); // flush mount restoration

    expect(getState().isDirty).toBe(true);
    expect(getState().draft).toEqual({ value: "restored-text" });

    // Change to a different non-server value (still dirty)
    act(() => getState().setDraft({ value: "edited" }));
    expect(getState().isDirty).toBe(true);

    act(() => vi.advanceTimersByTime(500));
    const stored = getStored<{ value: string }>("multi");
    expect(stored).not.toBeNull();
    expect(stored!.draft).toEqual({ value: "edited" });
  });

  // ── Restored draft → clear all → non-dirty (the bug we fixed) ─

  it("restored draft → clear field to match server → becomes clean, localStorage removed", async () => {
    seedStorage("fix", { value: "leftover" }, { value: "" });
    const { getState } = renderConfigurator({ value: "" }, "fix");
    await act(async () => {}); // flush mount restoration

    expect(getState().isDirty).toBe(true);
    expect(getState().restoredAt).not.toBeNull();

    // Clear the field back to serverState
    act(() => getState().setDraft({ value: "" }));
    expect(getState().isDirty).toBe(false);
    expect(localStorage.getItem(DRAFT_PREFIX + "fix")).toBeNull();
  });

  // ── Populate → clear → populate cycle ─────────────────────────

  it("populate → clear → populate again re-persists", () => {
    const { getState } = renderConfigurator({ value: "" });

    // Populate
    act(() => getState().setDraft({ value: "first" }));
    act(() => vi.advanceTimersByTime(500));
    expect(getStored<{ value: string }>("test")!.draft).toEqual({ value: "first" });

    // Clear
    act(() => getState().setDraft({ value: "" }));
    expect(localStorage.getItem(DRAFT_PREFIX + "test")).toBeNull();

    // Populate again
    act(() => getState().setDraft({ value: "second" }));
    act(() => vi.advanceTimersByTime(500));
    expect(getStored<{ value: string }>("test")!.draft).toEqual({ value: "second" });
  });

  // ── Restored → clear → reload → stays clear ──────────────────

  it("restored draft cleared to match server does not reappear on remount", async () => {
    seedStorage("reload", { value: "stale" }, { value: "" });
    const { getState, unmount } = renderConfigurator({ value: "" }, "reload");
    await act(async () => {});

    // Clear back to server value
    act(() => getState().setDraft({ value: "" }));
    expect(localStorage.getItem(DRAFT_PREFIX + "reload")).toBeNull();

    // Simulate reload: unmount and remount
    unmount();
    const { getState: getState2 } = renderConfigurator({ value: "" }, "reload");
    await act(async () => {});
    expect(getState2().draft).toEqual({ value: "" });
    expect(getState2().isDirty).toBe(false);
    expect(getState2().restoredAt).toBeNull();
  });
});
