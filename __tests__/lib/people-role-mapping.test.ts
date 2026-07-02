import { describe, it, expect } from "vitest";
import type { SportMember } from "@/lib/supabase/types";

/**
 * Tests for the People tab role mapping logic.
 * These functions are inline in admin-people-view.tsx but we replicate them
 * here to test the mapping contracts used throughout the feature.
 */

// Replicated from admin-people-view.tsx (not exported, so tested via contract)
type RoleLevel = "member" | "team" | "admin";

function roleLevelToUpdates(level: RoleLevel) {
  switch (level) {
    case "admin":
      return { role: "admin" as const, isTeamMember: true };
    case "team":
      return { role: "member" as const, isTeamMember: true };
    case "member":
      return { role: "member" as const, isTeamMember: false };
  }
}

function memberToRoleLevel(m: Pick<SportMember, "isSportAdmin" | "isTeamMember">): RoleLevel {
  if (m.isSportAdmin) return "admin";
  if (m.isTeamMember) return "team";
  return "member";
}

// ── roleLevelToUpdates ──────────────────────────────────────────

describe("roleLevelToUpdates", () => {
  it("admin → sport admin + team member", () => {
    expect(roleLevelToUpdates("admin")).toEqual({ role: "admin", isTeamMember: true });
  });

  it("team → sport member + team member", () => {
    expect(roleLevelToUpdates("team")).toEqual({ role: "member", isTeamMember: true });
  });

  it("member → sport member + NOT team member (triggers row deletion)", () => {
    expect(roleLevelToUpdates("member")).toEqual({ role: "member", isTeamMember: false });
  });
});

// ── memberToRoleLevel ──────────────────────────────────────────

describe("memberToRoleLevel", () => {
  it("sport admin → admin level", () => {
    expect(memberToRoleLevel({ isSportAdmin: true, isTeamMember: true })).toBe("admin");
  });

  it("sport admin without team member → still admin", () => {
    expect(memberToRoleLevel({ isSportAdmin: true, isTeamMember: false })).toBe("admin");
  });

  it("team member (not admin) → team level", () => {
    expect(memberToRoleLevel({ isSportAdmin: false, isTeamMember: true })).toBe("team");
  });

  it("no role, no team → member level", () => {
    expect(memberToRoleLevel({ isSportAdmin: false, isTeamMember: false })).toBe("member");
  });
});

// ── SportMember type contracts ──────────────────────────────────

describe("SportMember role fields are independent", () => {
  it("global admin with no sport role shows as no-role in sport context", () => {
    const member: Pick<
      SportMember,
      "isSportAdmin" | "isGlobalAdmin" | "isTeamMember" | "sportRole"
    > = {
      isSportAdmin: false,
      isGlobalAdmin: true,
      isTeamMember: false,
      sportRole: null,
    };
    // Global admin status doesn't affect sport role level
    expect(memberToRoleLevel(member)).toBe("member");
  });

  it("global admin with sport admin role shows as admin", () => {
    const member: Pick<
      SportMember,
      "isSportAdmin" | "isGlobalAdmin" | "isTeamMember" | "sportRole"
    > = {
      isSportAdmin: true,
      isGlobalAdmin: true,
      isTeamMember: true,
      sportRole: "admin",
    };
    expect(memberToRoleLevel(member)).toBe("admin");
  });
});

// ── "No role" means delete ──────────────────────────────────────

describe("no-role semantics", () => {
  it("setting to no-role produces member+false which triggers sport_roles deletion", () => {
    const updates = roleLevelToUpdates("member");
    // This is the signal to updateMemberRole to DELETE the row
    expect(updates.role).toBe("member");
    expect(updates.isTeamMember).toBe(false);
  });

  it("round-trip: member with no role → set to team → set back to no role", () => {
    // Start: no role
    const initial = memberToRoleLevel({ isSportAdmin: false, isTeamMember: false });
    expect(initial).toBe("member");

    // Set to team
    const teamUpdates = roleLevelToUpdates("team");
    expect(teamUpdates).toEqual({ role: "member", isTeamMember: true });

    // Set back to no role
    const noRoleUpdates = roleLevelToUpdates("member");
    expect(noRoleUpdates).toEqual({ role: "member", isTeamMember: false });
  });
});
