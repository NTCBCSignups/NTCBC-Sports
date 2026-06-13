import { describe, it, expect } from "vitest";
import {
  validateImmutableSessionTabValues,
  normalizeSessionTabValue,
  createSessionTabId,
  SESSION_TAB_VALUE_IMMUTABLE_ERROR,
} from "@/config/session-tab-rules";

// ── normalizeSessionTabValue ─────────────────────────────────────

describe("normalizeSessionTabValue", () => {
  it("trims whitespace", () => {
    expect(normalizeSessionTabValue("  hello  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeSessionTabValue("")).toBe("");
  });
});

// ── createSessionTabId ───────────────────────────────────────────

describe("createSessionTabId", () => {
  it("produces a string starting with tab-", () => {
    expect(createSessionTabId()).toMatch(/^tab-/);
  });

  it("produces unique ids", () => {
    const ids = new Set(Array.from({ length: 100 }, () => createSessionTabId()));
    expect(ids.size).toBe(100);
  });
});

// ── validateImmutableSessionTabValues ────────────────────────────

describe("validateImmutableSessionTabValues", () => {
  const prev = [
    { id: "tab-1", value: "regular" },
    { id: "tab-2", value: "competitive" },
  ];

  it("succeeds when values are unchanged", () => {
    const next = [
      { id: "tab-1", value: "regular" },
      { id: "tab-2", value: "competitive" },
    ];
    expect(validateImmutableSessionTabValues(prev, next)).toEqual({ success: true });
  });

  it("succeeds when a new tab is added", () => {
    const next = [
      { id: "tab-1", value: "regular" },
      { id: "tab-2", value: "competitive" },
      { id: "tab-3", value: "casual" },
    ];
    expect(validateImmutableSessionTabValues(prev, next)).toEqual({ success: true });
  });

  it("succeeds when a tab is removed", () => {
    const next = [{ id: "tab-1", value: "regular" }];
    expect(validateImmutableSessionTabValues(prev, next)).toEqual({ success: true });
  });

  it("fails when an existing tab value is changed", () => {
    const next = [
      { id: "tab-1", value: "changed" },
      { id: "tab-2", value: "competitive" },
    ];
    const result = validateImmutableSessionTabValues(prev, next);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(SESSION_TAB_VALUE_IMMUTABLE_ERROR);
    }
  });

  it("ignores tabs without an id", () => {
    const prevWithNoId = [{ id: undefined, value: "old" }];
    const nextWithNoId = [{ id: undefined, value: "new" }];
    expect(validateImmutableSessionTabValues(prevWithNoId, nextWithNoId)).toEqual({ success: true });
  });

  it("normalizes whitespace when comparing values", () => {
    const next = [
      { id: "tab-1", value: "  regular  " },
      { id: "tab-2", value: "competitive" },
    ];
    expect(validateImmutableSessionTabValues(prev, next)).toEqual({ success: true });
  });
});
