import { describe, it, expect } from "vitest";
import {
  resolveSportConfig,
  sportConfigFromDbRow,
  resolveSportConfigRow,
  getResolvedTab,
  PillColor,
  type SportConfig,
} from "@/config/config-resolver";
import { TAB_A, TAB_B, BASE_CONFIG, VALID_DB_ROW } from "../fixtures/config";

// ── resolveSportConfig ───────────────────────────────────────────

describe("resolveSportConfig", () => {
  it("resolves tabs from config", () => {
    const resolved = resolveSportConfig(BASE_CONFIG);
    expect(resolved.tabs).toHaveLength(2);
    expect(resolved.tabs[0]!.value).toBe("regular");
  });

  it("sets hasRestrictedAccess when a tab requires elevated signup role", () => {
    const resolved = resolveSportConfig(BASE_CONFIG);
    // TAB_B requires teamUser for signup (> user)
    expect(resolved.hasRestrictedAccess).toBe(true);
  });

  it("sets hasRestrictedAccess false when all tabs allow user signup", () => {
    const config: SportConfig = { ...BASE_CONFIG, tabs: [TAB_A] };
    const resolved = resolveSportConfig(config);
    expect(resolved.hasRestrictedAccess).toBe(false);
  });

  it("defaults tabs to empty array when undefined", () => {
    const config: SportConfig = { ...BASE_CONFIG, tabs: undefined };
    const resolved = resolveSportConfig(config);
    expect(resolved.tabs).toEqual([]);
    expect(resolved.hasRestrictedAccess).toBe(false);
  });
});

// ── sportConfigFromDbRow ─────────────────────────────────────────

describe("sportConfigFromDbRow", () => {
  it("converts a valid DB row to SportConfig", () => {
    const result = sportConfigFromDbRow(VALID_DB_ROW);
    expect(result).not.toBeNull();
    expect(result!.id).toBe("volleyball");
    expect(result!.day).toBe("Saturdays");
    expect(result!.location.name).toBe("Gym");
  });

  it("returns null when day is missing", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, day: "" } };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("returns null when day is undefined", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, day: undefined } };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("returns null when organizers is empty", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, organizers: "" } };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("returns null when notes is not an array", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, notes: "bad" as unknown as string[] } };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("returns null when location.name is empty", () => {
    const row = {
      ...VALID_DB_ROW,
      config: { ...VALID_DB_ROW.config, location: { name: "", address: "123 St" } },
    };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("returns null when location is missing", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, location: undefined } };
    expect(sportConfigFromDbRow(row)).toBeNull();
  });

  it("maps description null to undefined", () => {
    const result = sportConfigFromDbRow(VALID_DB_ROW);
    expect(result!.description).toBeUndefined();
  });

  it("maps description string correctly", () => {
    const row = { ...VALID_DB_ROW, description: "Fun sport" };
    const result = sportConfigFromDbRow(row);
    expect(result!.description).toBe("Fun sport");
  });
});

// ── resolveSportConfigRow ────────────────────────────────────────

describe("resolveSportConfigRow", () => {
  it("resolves a valid DB row end-to-end", () => {
    const result = resolveSportConfigRow(VALID_DB_ROW);
    expect(result).not.toBeNull();
    expect(result!.hasRestrictedAccess).toBe(false);
  });

  it("returns null for invalid DB row", () => {
    const row = { ...VALID_DB_ROW, config: { ...VALID_DB_ROW.config, day: "" } };
    expect(resolveSportConfigRow(row)).toBeNull();
  });
});

// ── getResolvedTab ───────────────────────────────────────────────

describe("getResolvedTab", () => {
  const resolved = resolveSportConfig(BASE_CONFIG);

  it("returns matching tab for known session type", () => {
    const tab = getResolvedTab(resolved, "regular");
    expect(tab.value).toBe("regular");
    expect(tab.label).toBe("Regular");
  });

  it("falls back to first tab with overridden value/label for unknown type", () => {
    const tab = getResolvedTab(resolved, "unknown-type");
    expect(tab.value).toBe("unknown-type");
    expect(tab.label).toBe("unknown-type");
    // Inherits permissions/color from first tab
    expect(tab.sessionPillColor).toBe(PillColor.emerald);
  });

  it("throws when config has no tabs at all", () => {
    const emptyResolved = resolveSportConfig({ ...BASE_CONFIG, tabs: [] });
    expect(() => getResolvedTab(emptyResolved, "anything")).toThrow(
      /no configured session tabs/,
    );
  });
});
