import { cache } from "react";
import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { Role } from "@/config/config-resolver";
import { getResolvedSportConfig } from "@/lib/get-sport-config";

/**
 * Reads the authenticated user forwarded by middleware via the
 * `x-supabase-user` request header.  No network call — instant.
 */
export async function getUser(): Promise<User | null> {
  const h = await headers();
  const raw = h.get("x-supabase-user");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as User;
  } catch {
    return null;
  }
}

/**
 * Resolves the highest Role a user qualifies for from a set of boolean qualifiers.
 * The qualifiers record maps each elevated Role (above `user`) to whether the
 * user satisfies it. Roles are checked highest-first so the most privileged match wins.
 */
export function getUserRole(user: User | null, qualifiers: Partial<Record<Role, boolean>>): Role {
  if (!user) return Role.anon;
  // Walk roles from highest to lowest (skip anon/user — they're the floor)
  const elevatedRoles = Object.values(Role)
    .filter((v): v is Role => typeof v === "number" && v > Role.user)
    .sort((a, b) => b - a);
  for (const role of elevatedRoles) {
    if (qualifiers[role]) return role;
  }
  return Role.user;
}

export interface UserSportRole {
  role: Role;
  isAdmin: boolean;
  isTeamMember: boolean;
}

/**
 * Resolves a user's admin and team-member status for a given sport.
 * Queries `profiles` and `sport_roles` in parallel.
 */
export async function getUserSportRole(
  supabase: SupabaseClient,
  userId: string,
  sport: string,
): Promise<UserSportRole> {
  const [sportConfig, { data: profile }, { data: sportRole }] = await Promise.all([
    getResolvedSportConfig(sport),
    supabase.from("profiles").select("role").eq("id", userId).single(),
    supabase
      .from("sport_roles")
      .select("role, is_team_member")
      .eq("user_id", userId)
      .eq("sport", sport)
      .single(),
  ]);

  // TODO: Revamp DB schema so role resolution maps directly from a single
  // `role` column (matching the Role enum) instead of combining separate
  // `profiles.role`, `sport_roles.role`, and `is_team_member` columns.
  const isAdmin = profile?.role === "admin" || sportRole?.role === "admin";
  const isTeamMember = sportConfig?.hasRestrictedAccess
    ? isAdmin || !!sportRole?.is_team_member
    : true;

  return {
    role: getUserRole({ id: userId } as User, {
      [Role.admin]: isAdmin,
      [Role.teamUser]: isTeamMember,
    }),
    isAdmin,
    isTeamMember,
  };
}

/**
 * Request-scoped cached version of getUserSportRole.
 * Deduplicates multiple calls with the same (supabase, userId, sport) within
 * a single React render pass (e.g., AdminButtonGate + CalendarExportGate).
 */
export const getCachedUserSportRole = cache(getUserSportRole);

/**
 * Asserts the current user is an admin for the given sport.
 * Returns the authenticated user on success, or an error object on failure.
 * Combines auth check + role check in a single call with parallel queries.
 */
export async function requireSportAdmin(
  supabase: SupabaseClient,
  sport: string,
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (role < Role.admin) return { success: false, error: "Not authorized" };

  return { success: true, user };
}

/**
 * Checks whether a user holds the platform-wide admin role (profiles.role = 'admin').
 */
export async function checkGlobalAdmin(supabase: SupabaseClient, userId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return profile?.role === "admin";
}

/**
 * Asserts the current user is a platform-wide admin.
 * Returns the authenticated user on success, or an error object on failure.
 */
export async function requireGlobalAdmin(
  supabase: SupabaseClient,
): Promise<{ success: true; user: User } | { success: false; error: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };
  const isAdmin = await checkGlobalAdmin(supabase, user.id);
  if (!isAdmin) return { success: false, error: "Not authorized" };
  return { success: true, user };
}

/**
 * Asserts the current user is either a sport admin or the facilitator
 * for the given session. Returns the authenticated user on success.
 */
export async function requireSessionAdminOrFacilitator(
  supabase: SupabaseClient,
  sport: string,
  sessionId: string,
): Promise<{ success: true; user: User; isAdmin: boolean } | { success: false; error: string }> {
  const user = await getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (role >= Role.admin) return { success: true, user, isAdmin: true };

  // Check if user is the session facilitator
  const { data: session } = await supabase
    .from("sessions")
    .select("facilitator_id")
    .eq("id", sessionId)
    .single();

  if (session?.facilitator_id === user.id) return { success: true, user, isAdmin: false };

  return { success: false, error: "Not authorized" };
}
