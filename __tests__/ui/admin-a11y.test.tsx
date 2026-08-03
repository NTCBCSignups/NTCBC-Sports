// @vitest-environment happy-dom
/**
 * Accessibility audit tests for admin components.
 *
 * Uses vitest-axe (axe-core) to verify WCAG 2.1 AA compliance.
 * These tests catch missing labels, roles, ARIA attributes,
 * color contrast issues, and structural violations.
 *
 * Added to the pre-push test suite via vitest.config.mts setup.
 */
import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { axe } from "vitest-axe";
import AdminAccessRequests from "@/components/sports/admin/admin-access-requests";
import type { Profile, AccessRequestStatus } from "@/lib/supabase/types";

// Mock the server action to prevent RSC import errors
vi.mock(import("@/lib/actions/team-access"), () => ({
  reviewTeamAccessRequest: vi.fn(),
}));

// ── Fixtures ─────────────────────────────────────────────────────

function mockProfile(overrides?: Partial<Profile>): Profile {
  return {
    id: "user-1",
    email: "alice@example.com",
    full_name: "Alice Smith",
    avatar_url: null,
    role: "user",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const MOCK_REQUESTS: Array<{
  id: string;
  user_id: string;
  status: AccessRequestStatus;
  created_at: string;
  profiles: Profile;
}> = [
  {
    id: "req-1",
    user_id: "user-1",
    status: "pending",
    created_at: "2025-06-01T10:00:00Z",
    profiles: mockProfile(),
  },
  {
    id: "req-2",
    user_id: "user-2",
    status: "rejected",
    created_at: "2025-05-15T10:00:00Z",
    profiles: mockProfile({ id: "user-2", full_name: "Bob Jones", email: "bob@example.com" }),
  },
];

// ── Tests ────────────────────────────────────────────────────────

describe("AdminAccessRequests accessibility", () => {
  it("passes axe audit with requests", async () => {
    const { container } = render(
      <AdminAccessRequests sport="basketball" requests={MOCK_REQUESTS} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it("passes axe audit with empty state", async () => {
    const { container } = render(<AdminAccessRequests sport="basketball" requests={[]} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
