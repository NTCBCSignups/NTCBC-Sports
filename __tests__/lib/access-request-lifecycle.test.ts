import { describe, it, expect, beforeEach } from "vitest";
import type { AccessRequestStatus } from "@/lib/supabase/types";

/**
 * Tests for the team_access_requests lifecycle contracts.
 *
 * The new lifecycle:
 * 1. User requests → row with status='pending' is created
 * 2. Admin approves → sport_role created, request row DELETED
 * 3. Admin rejects → status set to 'rejected', row stays
 * 4. User acknowledges rejection → row DELETED (can re-request)
 * 5. User re-requests → rejected row DELETED + new pending row INSERT
 *
 * Key invariant: table only holds 'pending' or 'rejected' rows, never 'approved'
 */

// Simulate the state machine
type RequestRow = { userId: string; sport: string; status: AccessRequestStatus };
type SportRoleRow = { userId: string; sport: string; isTeamMember: boolean };

class AccessRequestLifecycle {
  requests: RequestRow[] = [];
  sportRoles: SportRoleRow[] = [];

  request(userId: string, sport: string): { success?: boolean; error?: string } {
    const existing = this.requests.find((r) => r.userId === userId && r.sport === sport);
    if (existing) return { error: "Request already submitted" };
    this.requests.push({ userId, sport, status: "pending" });
    return { success: true };
  }

  approve(userId: string, sport: string): { success?: boolean; error?: string } {
    const idx = this.requests.findIndex(
      (r) => r.userId === userId && r.sport === sport && r.status === "pending",
    );
    if (idx === -1) return { error: "Request not found" };

    // Create/update sport_role
    const existingRole = this.sportRoles.find((r) => r.userId === userId && r.sport === sport);
    if (existingRole) {
      existingRole.isTeamMember = true;
    } else {
      this.sportRoles.push({ userId, sport, isTeamMember: true });
    }

    // DELETE the request row
    this.requests.splice(idx, 1);
    return { success: true };
  }

  reject(userId: string, sport: string): { success?: boolean; error?: string } {
    const req = this.requests.find(
      (r) => r.userId === userId && r.sport === sport && r.status === "pending",
    );
    if (!req) return { error: "Request not found" };
    req.status = "rejected";
    return { success: true };
  }

  acknowledge(userId: string, sport: string): { success?: boolean; error?: string } {
    const idx = this.requests.findIndex(
      (r) => r.userId === userId && r.sport === sport && r.status === "rejected",
    );
    if (idx === -1) return { error: "No rejected request to acknowledge" };
    this.requests.splice(idx, 1);
    return { success: true };
  }

  reRequest(userId: string, sport: string): { success?: boolean; error?: string } {
    const idx = this.requests.findIndex(
      (r) => r.userId === userId && r.sport === sport && r.status === "rejected",
    );
    if (idx === -1) return { error: "No rejected request to re-request" };
    // Delete + insert fresh pending
    this.requests.splice(idx, 1);
    this.requests.push({ userId, sport, status: "pending" });
    return { success: true };
  }
}

describe("access request lifecycle", () => {
  let lifecycle: AccessRequestLifecycle;

  beforeEach(() => {
    lifecycle = new AccessRequestLifecycle();
  });

  it("creates a pending request", () => {
    expect(lifecycle.request("user-1", "softball")).toEqual({ success: true });
    expect(lifecycle.requests).toHaveLength(1);
    expect(lifecycle.requests[0]!.status).toBe("pending");
  });

  it("prevents duplicate requests", () => {
    lifecycle.request("user-1", "softball");
    expect(lifecycle.request("user-1", "softball")).toEqual({ error: "Request already submitted" });
  });

  it("approve creates sport_role and DELETES request", () => {
    lifecycle.request("user-1", "softball");
    expect(lifecycle.approve("user-1", "softball")).toEqual({ success: true });

    // Request is gone
    expect(lifecycle.requests).toHaveLength(0);
    // Sport role was created
    expect(lifecycle.sportRoles).toHaveLength(1);
    expect(lifecycle.sportRoles[0]).toEqual({
      userId: "user-1",
      sport: "softball",
      isTeamMember: true,
    });
  });

  it("table never contains approved rows", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.approve("user-1", "softball");
    const approved = lifecycle.requests.filter((r) => r.status === "approved");
    expect(approved).toHaveLength(0);
  });

  it("reject keeps row with rejected status", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.reject("user-1", "softball");
    expect(lifecycle.requests).toHaveLength(1);
    expect(lifecycle.requests[0]!.status).toBe("rejected");
  });

  it("acknowledge deletes rejected request", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.reject("user-1", "softball");
    expect(lifecycle.acknowledge("user-1", "softball")).toEqual({ success: true });
    expect(lifecycle.requests).toHaveLength(0);
  });

  it("re-request resets rejected to pending", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.reject("user-1", "softball");
    expect(lifecycle.reRequest("user-1", "softball")).toEqual({ success: true });
    expect(lifecycle.requests).toHaveLength(1);
    expect(lifecycle.requests[0]!.status).toBe("pending");
  });

  it("can re-request then get approved", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.reject("user-1", "softball");
    lifecycle.reRequest("user-1", "softball");
    lifecycle.approve("user-1", "softball");
    expect(lifecycle.requests).toHaveLength(0);
    expect(lifecycle.sportRoles[0]!.isTeamMember).toBe(true);
  });

  it("user can request for multiple sports independently", () => {
    lifecycle.request("user-1", "softball");
    lifecycle.request("user-1", "basketball");
    expect(lifecycle.requests).toHaveLength(2);
    lifecycle.approve("user-1", "softball");
    expect(lifecycle.requests).toHaveLength(1);
    expect(lifecycle.requests[0]!.sport).toBe("basketball");
  });

  it("acknowledge only works on rejected (not pending)", () => {
    lifecycle.request("user-1", "softball");
    expect(lifecycle.acknowledge("user-1", "softball").error).toBeDefined();
  });

  it("re-request only works on rejected (not pending)", () => {
    lifecycle.request("user-1", "softball");
    expect(lifecycle.reRequest("user-1", "softball").error).toBeDefined();
  });
});
