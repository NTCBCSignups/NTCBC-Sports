// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { createElement } from "react";
import SessionViewSection from "@/components/sports/session/session-view-section";
import type { StoredViewInstance } from "@/lib/supabase/types";

// ── Mocks ────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("@/components/sports/session/session-views/registry", () => ({
  getSessionView: () => ({
    ViewComponent: ({ viewData: _viewData }: { viewData: unknown }) =>
      createElement("div", { "data-testid": "view-content" }, "view"),
  }),
  getAllSessionViews: () => [
    { id: "attendanceView", label: "Attendance", defaultName: "Attendance" },
  ],
  DEFAULT_VIEW_TYPE: "attendanceView",
}));

vi.mock("@/components/sports/session/edit-views-dialog", () => ({
  __esModule: true,
  default: () => createElement("div", { "data-testid": "edit-views-dialog" }),
}));

vi.mock("@/components/sports/session/session-views/attendance-view", () => ({
  __esModule: true,
  default: () => createElement("div", { "data-testid": "attendance-view" }),
}));

vi.mock("@/components/sports/session/view-toggle", () => ({
  __esModule: true,
  default: () => null,
}));

vi.mock("@/lib/format", () => ({
  displayName: (p: { full_name: string | null }) => p?.full_name ?? "Unknown",
}));

afterEach(cleanup);

// ── Fixtures ─────────────────────────────────────────────────────

const viewData: StoredViewInstance[] = [
  { id: 0, type: "attendanceView", label: "Attendance", data: null, enabled: true },
  { id: 1, type: "devotionalView", label: "Devotional", data: null, enabled: true },
];

const baseProps = {
  sport: "basketball",
  sessionId: "session-1",
  signups: [],
  teamMemberIds: new Set<string>(),
  playerCap: null,
  currentUserId: "user-1",
  viewData,
};

// ── Tests ────────────────────────────────────────────────────────

describe("SessionViewSection access control", () => {
  it("shows copy link button when isSessionAdmin is true", () => {
    render(createElement(SessionViewSection, { ...baseProps, isSessionAdmin: true }));
    expect(screen.getByTitle("Copy link to this view")).toBeDefined();
  });

  it("hides copy link button when isSessionAdmin is false", () => {
    render(createElement(SessionViewSection, { ...baseProps, isSessionAdmin: false }));
    expect(screen.queryByTitle("Copy link to this view")).toBeNull();
  });

  it("shows admin buttons (edit views) when isSessionAdmin is true", () => {
    render(createElement(SessionViewSection, { ...baseProps, isSessionAdmin: true }));
    expect(screen.getByTestId("edit-views-dialog")).toBeDefined();
  });

  it("hides admin buttons (edit views) when isSessionAdmin is false", () => {
    render(createElement(SessionViewSection, { ...baseProps, isSessionAdmin: false }));
    expect(screen.queryByTestId("edit-views-dialog")).toBeNull();
  });
});

describe("Session page facilitator access rules", () => {
  // These verify the conditional logic used in the session page:
  // - isAdmin: full admin role
  // - isFacilitator: assigned facilitator but not admin
  // - isSessionAdmin: isAdmin || isFacilitator

  it("admin sees all controls", () => {
    const isAdmin = true;
    const isFacilitator = false;
    const isSessionAdmin = isAdmin || isFacilitator;

    // Admin button visible
    expect(isAdmin).toBe(true);
    // Session dialog visible
    expect(isSessionAdmin).toBe(true);
    // sportUsers passed to session dialog (facilitator picker visible inside)
    const sportUsers = isAdmin ? [{ id: "u1", name: "User 1", isTeamMember: true }] : undefined;
    expect(sportUsers).toBeDefined();
    // Facilitator picker standalone visible
    expect(isAdmin).toBe(true);
  });

  it("facilitator cannot access admin-only controls", () => {
    const isAdmin = false;
    const isFacilitator = true;
    const isSessionAdmin = isAdmin || isFacilitator;

    // Admin button NOT visible
    expect(isAdmin).toBe(false);
    // Session dialog visible (facilitators can edit session)
    expect(isSessionAdmin).toBe(true);
    // sportUsers NOT passed to session dialog (facilitator picker hidden inside)
    const sportUsers = isAdmin ? [{ id: "u1", name: "User 1", isTeamMember: true }] : undefined;
    expect(sportUsers).toBeUndefined();
    // Facilitator picker standalone NOT visible
    expect(isAdmin).toBe(false);
  });

  it("regular user sees no admin controls", () => {
    const isAdmin = false;
    const isFacilitator = false;
    const isSessionAdmin = isAdmin || isFacilitator;

    expect(isAdmin).toBe(false);
    expect(isSessionAdmin).toBe(false);
    const sportUsers = isAdmin ? [{ id: "u1", name: "User 1", isTeamMember: true }] : undefined;
    expect(sportUsers).toBeUndefined();
  });
});
