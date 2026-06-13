import { describe, it, expect } from "vitest";
import { getUserRole } from "@/lib/supabase/user";
import { Role } from "@/config/config-resolver";
import type { User } from "@supabase/supabase-js";

const MOCK_USER = { id: "user-123" } as User;

describe("getUserRole", () => {
  it("returns anon when user is null", () => {
    expect(getUserRole(null, {})).toBe(Role.anon);
  });

  it("returns user when no qualifiers match", () => {
    expect(getUserRole(MOCK_USER, {})).toBe(Role.user);
  });

  it("returns user when all qualifiers are false", () => {
    expect(getUserRole(MOCK_USER, { [Role.admin]: false, [Role.teamUser]: false })).toBe(Role.user);
  });

  it("returns admin when admin qualifier is true", () => {
    expect(getUserRole(MOCK_USER, { [Role.admin]: true })).toBe(Role.admin);
  });

  it("returns teamUser when teamUser qualifier is true", () => {
    expect(getUserRole(MOCK_USER, { [Role.teamUser]: true })).toBe(Role.teamUser);
  });

  it("returns highest matching role when multiple qualifiers are true", () => {
    expect(getUserRole(MOCK_USER, { [Role.admin]: true, [Role.teamUser]: true })).toBe(Role.admin);
  });

  it("returns teamUser when only teamUser is true (admin is false)", () => {
    expect(getUserRole(MOCK_USER, { [Role.admin]: false, [Role.teamUser]: true })).toBe(Role.teamUser);
  });
});
