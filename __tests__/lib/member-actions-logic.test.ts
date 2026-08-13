import { describe, it, expect } from "vitest";
import type { SportRoleType } from "@/lib/supabase/types";

/**
 * Tests for the member management action logic contracts.
 *
 * Key rules:
 * 1. Setting role to "member" + isTeamMember=false means "no role" → DELETE sport_roles row
 * 2. Any other combination → UPSERT sport_roles row
 * 3. Demoting/removing users is blocked when it would leave zero admins
 * 4. addMember only inserts if granting elevated access
 */

// Simulate the action logic
function shouldDeleteRole(updates: { role?: SportRoleType; isTeamMember?: boolean }): boolean {
  const effectiveRole = updates.role ?? "member";
  const effectiveTeam = updates.isTeamMember ?? false;
  return effectiveRole === "member" && !effectiveTeam;
}

function shouldInsertOnAdd(options: { role?: SportRoleType; isTeamMember?: boolean }): boolean {
  const effectiveRole = options.role ?? "member";
  const effectiveTeam = options.isTeamMember ?? false;
  return effectiveRole !== "member" || effectiveTeam;
}

/** Simulates wouldOrphanAdmins: would removing targetUserIds from the admin set leave zero? */
function wouldOrphanAdmins(adminUserIds: string[], targetUserIds: string[]): boolean {
  const targetSet = new Set(targetUserIds);
  return adminUserIds.filter((id) => !targetSet.has(id)).length === 0;
}

describe("member action: no-role = delete", () => {
  it("member + no team → delete", () => {
    expect(shouldDeleteRole({ role: "member", isTeamMember: false })).toBe(true);
  });

  it("defaults (no args) → delete", () => {
    expect(shouldDeleteRole({})).toBe(true);
  });

  it("member + team member → upsert (not delete)", () => {
    expect(shouldDeleteRole({ role: "member", isTeamMember: true })).toBe(false);
  });

  it("admin + no team → upsert", () => {
    expect(shouldDeleteRole({ role: "admin", isTeamMember: false })).toBe(false);
  });

  it("admin + team → upsert", () => {
    expect(shouldDeleteRole({ role: "admin", isTeamMember: true })).toBe(false);
  });
});

describe("member action: addMember only inserts for elevated access", () => {
  it("no options → no insert (nothing to grant)", () => {
    expect(shouldInsertOnAdd({})).toBe(false);
  });

  it("member + no team → no insert", () => {
    expect(shouldInsertOnAdd({ role: "member", isTeamMember: false })).toBe(false);
  });

  it("member + team → insert (team membership is elevated)", () => {
    expect(shouldInsertOnAdd({ role: "member", isTeamMember: true })).toBe(true);
  });

  it("admin → insert", () => {
    expect(shouldInsertOnAdd({ role: "admin" })).toBe(true);
  });

  it("admin + team → insert", () => {
    expect(shouldInsertOnAdd({ role: "admin", isTeamMember: true })).toBe(true);
  });
});

describe("member action: orphan-admin guard", () => {
  it("blocks when demoting the only admin", () => {
    expect(wouldOrphanAdmins(["admin-1"], ["admin-1"])).toBe(true);
  });

  it("allows demoting self when other admins exist", () => {
    expect(wouldOrphanAdmins(["admin-1", "admin-2"], ["admin-1"])).toBe(false);
  });

  it("blocks bulk demoting all admins at once", () => {
    expect(wouldOrphanAdmins(["admin-1", "admin-2"], ["admin-1", "admin-2"])).toBe(true);
  });

  it("allows bulk demoting subset when other admins remain", () => {
    expect(wouldOrphanAdmins(["admin-1", "admin-2", "admin-3"], ["admin-1", "admin-2"])).toBe(
      false,
    );
  });

  it("allows removing non-admin users regardless of admin count", () => {
    expect(wouldOrphanAdmins(["admin-1"], ["user-2"])).toBe(false);
  });
});

describe("member action: bulk operations", () => {
  it("bulk with self included + only admin is blocked", () => {
    const callerUserId = "admin-1";
    const targetUserIds = ["user-1", "user-2", "admin-1"];
    const selfIncluded = targetUserIds.includes(callerUserId);
    expect(selfIncluded).toBe(true);
    expect(wouldOrphanAdmins(["admin-1"], targetUserIds)).toBe(true);
  });

  it("bulk with self included + other admins is allowed", () => {
    const callerUserId = "admin-1";
    const targetUserIds = ["user-1", "admin-1"];
    const selfIncluded = targetUserIds.includes(callerUserId);
    expect(selfIncluded).toBe(true);
    expect(wouldOrphanAdmins(["admin-1", "admin-2"], targetUserIds)).toBe(false);
  });

  it("bulk without self is allowed", () => {
    const callerUserId = "admin-1";
    const targetUserIds = ["user-1", "user-2"];
    const selfIncluded = targetUserIds.includes(callerUserId);
    expect(selfIncluded).toBe(false);
  });
});
