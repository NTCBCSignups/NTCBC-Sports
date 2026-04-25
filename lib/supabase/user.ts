import { headers } from "next/headers";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { sportsConfig } from "@/lib/sports-config";

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

export interface UserSportRole {
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
    const sportConfig = sportsConfig[sport];

    const [{ data: profile }, { data: sportRole }] = await Promise.all([
        supabase.from("profiles").select("role").eq("id", userId).single(),
        supabase
            .from("sport_roles")
            .select("role, is_team_member")
            .eq("user_id", userId)
            .eq("sport", sport)
            .single(),
    ]);

    const isAdmin =
        profile?.role === "admin" || sportRole?.role === "admin";
    const isTeamMember = sportConfig?.restrictedAccessEnabled
        ? isAdmin || !!sportRole?.is_team_member
        : true;

    return { isAdmin, isTeamMember };
}

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

    const { isAdmin } = await getUserSportRole(supabase, user.id, sport);
    if (!isAdmin) return { success: false, error: "Not authorized" };

    return { success: true, user };
}
