import { describe, expect, it } from "vitest";
import {
  createKey,
  buildInitialState,
  createEditableAdminTab,
} from "@/components/sports/admin/admin-tabs/settings/helpers";
import { AccessLevel, PillColor, Role } from "@/config/config-resolver";
import type { ResolvedSportConfig, SessionTab, AdminTabMeta } from "@/config/config-interfaces";

// ── Fixtures ─────────────────────────────────────────────────────

const TAB: SessionTab = {
  id: "tab-pickup",
  value: "pickup",
  label: "Pickup",
  defaultTitlePrefix: "Pickup",
  sessionPillColor: PillColor.blue,
  permissions: {
    [AccessLevel.overview]: Role.anon,
    [AccessLevel.view]: Role.anon,
    [AccessLevel.signup]: Role.user,
    [AccessLevel.admin]: Role.admin,
  },
};

const ADMIN_TAB: AdminTabMeta = {
  id: "roster",
  label: "Roster",
  iconName: "Users",
};

const CONFIG: ResolvedSportConfig = {
  id: "basketball" as ResolvedSportConfig["id"],
  emoji: "🏀",
  name: "Basketball",
  type: "sport",
  location: { name: "Gym", address: "123 Main St", mapsLink: "https://maps.example.com" },
  day: "Tuesday",
  organizers: "Alice, Bob",
  notes: ["Bring shoes", "No food"],
  tabs: [TAB],
  adminTabs: [ADMIN_TAB],
  hasRestrictedAccess: false,
};

// ── Tests ────────────────────────────────────────────────────────

describe("createKey", () => {
  it("returns deterministic key when id is provided", () => {
    expect(createKey("tab", "abc")).toBe("tab-abc");
    expect(createKey("tab", "abc")).toBe("tab-abc");
  });

  it("returns random key when id is omitted", () => {
    const a = createKey("tab");
    const b = createKey("tab");
    expect(a).not.toBe(b);
    expect(a).toMatch(/^tab-[a-z0-9]+$/);
  });
});

describe("createEditableAdminTab", () => {
  it("derives key from tab id", () => {
    const result = createEditableAdminTab(ADMIN_TAB);
    expect(result.key).toBe("admin-tab-roster");
  });
});

describe("buildInitialState", () => {
  it("produces identical output on repeated calls (deterministic keys)", () => {
    const a = buildInitialState("basketball", CONFIG);
    const b = buildInitialState("basketball", CONFIG);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it("tab keys are derived from tab id", () => {
    const state = buildInitialState("basketball", CONFIG);
    expect(state.tabs[0]!.key).toBe("tab-tab-pickup");
  });

  it("admin tab keys are derived from admin tab id", () => {
    const state = buildInitialState("basketball", CONFIG);
    expect(state.adminTabs[0]!.key).toBe("admin-tab-roster");
  });

  it("survives JSON round-trip without becoming dirty", () => {
    const state = buildInitialState("basketball", CONFIG);
    const roundTripped = JSON.parse(JSON.stringify(state));
    // Simulates localStorage restore → re-stringify must match baseline
    expect(JSON.stringify(roundTripped)).toBe(JSON.stringify(state));
  });
});
