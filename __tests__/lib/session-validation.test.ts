import { describe, it, expect } from "vitest";
import { createSessionInputSchema } from "@/lib/actions/session-validation";

// ── Fixtures ─────────────────────────────────────────────────────

const VALID_INPUT = {
  session_type: "regular",
  title: "Week 1",
  date: "2025-03-15",
  time_start: "18:00",
  time_end: "20:00",
  location_name: "Gym",
  location_address: "123 Main St",
  location_maps_link: null,
  player_cap: 12,
  signup_open: "2025-03-14T09:00",
  signup_close: "2025-03-15T17:00",
  notes: null,
};

function parseInput(overrides: Record<string, unknown> = {}) {
  return createSessionInputSchema.safeParse({ ...VALID_INPUT, ...overrides });
}

function getErrors(overrides: Record<string, unknown> = {}) {
  const result = parseInput(overrides);
  return result.success ? [] : result.error.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
}

// ── Basic field validation ───────────────────────────────────────

describe("createSessionInputSchema - required fields", () => {
  it("passes with all valid fields", () => {
    expect(parseInput().success).toBe(true);
  });

  it("fails when session_type is empty", () => {
    const errors = getErrors({ session_type: "" });
    expect(errors).toContainEqual(expect.objectContaining({ path: "session_type" }));
  });

  it("fails when date is empty", () => {
    const errors = getErrors({ date: "" });
    expect(errors).toContainEqual(expect.objectContaining({ path: "date" }));
  });

  it("fails when time_start is empty", () => {
    const errors = getErrors({ time_start: "" });
    expect(errors).toContainEqual(expect.objectContaining({ path: "time_start" }));
  });

  it("fails when location_name is empty", () => {
    const errors = getErrors({ location_name: "" });
    expect(errors).toContainEqual(expect.objectContaining({ path: "location_name" }));
  });
});

// ── Optional string coercion ─────────────────────────────────────

describe("createSessionInputSchema - optional string coercion", () => {
  it("trims title and coerces whitespace-only to null", () => {
    const result = parseInput({ title: "   " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBeNull();
  });

  it("trims title and keeps non-empty value", () => {
    const result = parseInput({ title: "  Hello  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.title).toBe("Hello");
  });

  it("accepts null for optional fields", () => {
    const result = parseInput({ title: null, notes: null, location_maps_link: null });
    expect(result.success).toBe(true);
  });
});

// ── Time validation (superRefine) ────────────────────────────────

describe("createSessionInputSchema - time logic", () => {
  it("fails when start time >= end time", () => {
    const errors = getErrors({ time_start: "20:00", time_end: "18:00" });
    expect(errors).toContainEqual(
      expect.objectContaining({ path: "time_end", message: expect.stringContaining("before end time") }),
    );
  });

  it("fails when start time equals end time", () => {
    const errors = getErrors({ time_start: "18:00", time_end: "18:00" });
    expect(errors).toContainEqual(expect.objectContaining({ path: "time_end" }));
  });

  it("fails when signup_open >= signup_close", () => {
    const errors = getErrors({
      signup_open: "2025-03-15T18:00",
      signup_close: "2025-03-15T17:00",
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ path: "signup_close", message: expect.stringContaining("before sign-up close") }),
    );
  });

  it("fails when signup_open is after session start", () => {
    const errors = getErrors({
      date: "2025-03-15",
      time_start: "18:00",
      signup_open: "2025-03-15T19:00",
      signup_close: "2025-03-15T20:00",
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ path: "signup_open", message: expect.stringContaining("after session start") }),
    );
  });

  it("fails when signup_close is after end of session day", () => {
    const errors = getErrors({
      date: "2025-03-15",
      signup_open: "2025-03-14T09:00",
      signup_close: "2025-03-16T01:00",
    });
    expect(errors).toContainEqual(
      expect.objectContaining({ path: "signup_close", message: expect.stringContaining("session date") }),
    );
  });
});

// ── Player cap ───────────────────────────────────────────────────

describe("createSessionInputSchema - player_cap", () => {
  it("accepts null player_cap", () => {
    expect(parseInput({ player_cap: null }).success).toBe(true);
  });

  it("accepts positive integer", () => {
    expect(parseInput({ player_cap: 10 }).success).toBe(true);
  });

  it("rejects zero", () => {
    expect(parseInput({ player_cap: 0 }).success).toBe(false);
  });

  it("rejects negative number", () => {
    expect(parseInput({ player_cap: -1 }).success).toBe(false);
  });

  it("rejects non-integer", () => {
    expect(parseInput({ player_cap: 5.5 }).success).toBe(false);
  });
});
