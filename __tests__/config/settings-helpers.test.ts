import { describe, expect, it } from "vitest";
import {
  createKey,
  buildInitialState,
  createEditableAdminTab,
  createDefaultPermissions,
  createBlankTabDraft,
  toTabSlug,
  summarizePermissions,
  updateTabByKey,
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

// ── createDefaultPermissions ─────────────────────────────────────

describe("createDefaultPermissions", () => {
  it("returns all four access levels", () => {
    const perms = createDefaultPermissions();
    expect(perms).toHaveProperty(AccessLevel.overview);
    expect(perms).toHaveProperty(AccessLevel.view);
    expect(perms).toHaveProperty(AccessLevel.signup);
    expect(perms).toHaveProperty(AccessLevel.admin);
  });

  it("defaults overview and view to anon, signup to user, admin to admin", () => {
    const perms = createDefaultPermissions();
    expect(perms[AccessLevel.overview]).toBe(Role.anon);
    expect(perms[AccessLevel.view]).toBe(Role.anon);
    expect(perms[AccessLevel.signup]).toBe(Role.user);
    expect(perms[AccessLevel.admin]).toBe(Role.admin);
  });
});

// ── createBlankTabDraft ──────────────────────────────────────────

describe("createBlankTabDraft", () => {
  it("generates unique keys across calls", () => {
    const a = createBlankTabDraft();
    const b = createBlankTabDraft();
    expect(a.key).not.toBe(b.key);
  });

  it("starts with empty value/label and gray pill color", () => {
    const tab = createBlankTabDraft();
    expect(tab.value).toBe("");
    expect(tab.label).toBe("");
    expect(tab.sessionPillColor).toBe(PillColor.gray);
    expect(tab.signupConfirmationDialog).toBeUndefined();
  });

  it("includes default permissions", () => {
    const tab = createBlankTabDraft();
    expect(tab.permissions[AccessLevel.signup]).toBe(Role.user);
  });
});

// ── toTabSlug ────────────────────────────────────────────────────

describe("toTabSlug", () => {
  it("lowercases and converts spaces to dashes", () => {
    expect(toTabSlug("My Sport")).toBe("my-sport");
  });

  it("strips special characters", () => {
    expect(toTabSlug("Game Day!")).toBe("game-day");
  });

  it("collapses multiple dashes", () => {
    expect(toTabSlug("a - - b")).toBe("a-b");
  });

  it("trims leading/trailing dashes", () => {
    expect(toTabSlug("  --hello--  ")).toBe("hello");
  });

  it("returns empty string for empty input", () => {
    expect(toTabSlug("")).toBe("");
    expect(toTabSlug("   ")).toBe("");
  });
});

// ── summarizePermissions ─────────────────────────────────────────

describe("summarizePermissions", () => {
  it("formats default permissions as pipe-separated string", () => {
    const summary = summarizePermissions(createDefaultPermissions());
    expect(summary).toContain("Overview: Anyone");
    expect(summary).toContain("View: Anyone");
    expect(summary).toContain("Signup: Signed-in users");
    expect(summary).toContain("Admin: Admins");
    expect(summary.split(" | ")).toHaveLength(4);
  });

  it("reflects custom role assignments", () => {
    const perms = {
      ...createDefaultPermissions(),
      [AccessLevel.signup]: Role.teamUser,
    };
    const summary = summarizePermissions(perms);
    expect(summary).toContain("Signup: Team members");
  });
});

// ── updateTabByKey ───────────────────────────────────────────────

describe("updateTabByKey", () => {
  const tab1 = { ...createBlankTabDraft(), key: "tab-1", label: "One" };
  const tab2 = { ...createBlankTabDraft(), key: "tab-2", label: "Two" };

  it("updates the matching tab and preserves others", () => {
    const result = updateTabByKey([tab1, tab2], "tab-2", (t) => ({ ...t, label: "Updated" }));
    expect(result).toHaveLength(2);
    expect(result[0]!.label).toBe("One");
    expect(result[1]!.label).toBe("Updated");
  });

  it("returns unchanged array when key not found", () => {
    const tabs = [tab1, tab2];
    const result = updateTabByKey(tabs, "tab-999", (t) => ({ ...t, label: "X" }));
    expect(result[0]!.label).toBe("One");
    expect(result[1]!.label).toBe("Two");
  });

  it("works with empty array", () => {
    const result = updateTabByKey([], "tab-1", (t) => ({ ...t, label: "X" }));
    expect(result).toHaveLength(0);
  });
});
