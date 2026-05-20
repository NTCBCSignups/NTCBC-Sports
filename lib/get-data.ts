import { createClient } from "@/lib/supabase/server";
import { getTodayInSportTimezone } from "@/lib/timezone";
import type { AccessRequestStatus, Profile, SignupStatus } from "@/lib/supabase/types";

// ── Data functions ──────────────────────────────────────────────
// Centralized queries using the user's Supabase client (respects RLS).

/** Upcoming sessions with signup counts for a sport page. */
export async function getUpcomingSessions(sport: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("sessions")
        .select("*, signups(count)")
        .eq("sport", sport)
        .neq("signups.status", "cancelled")
        .neq("signups.status", "declined")
        .gte("date", getTodayInSportTimezone())
        .order("date", { ascending: true });

    return (data ?? []).map((s) => ({
        ...s,
        signup_count:
            (s.signups as unknown as { count: number }[])?.[0]?.count ?? 0,
    }));
}

/** All sessions for admin view (upcoming + past). */
export async function getAllSessions(sport: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("sport", sport)
        .order("date", { ascending: false });

    return data ?? [];
}

/** Single session by ID. */
export async function getSession(sessionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

    return data;
}

/** All signups for a session (with profile info). */
export async function getSessionSignups(sessionId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("signups")
        .select("*, profiles(id, email, full_name, avatar_url, role, created_at, updated_at)")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true });

    return (data ?? []).map((s) => ({
        ...s,
        profiles: (s.profiles ?? null) as Profile | null,
    }));
}

/** Access requests for a sport (admin view). */
export async function getAccessRequests(sport: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("team_access_requests")
        .select(
            "*, profiles!team_access_requests_user_id_fkey(id, email, full_name, avatar_url, role, created_at, updated_at)",
        )
        .eq("sport", sport)
        .order("created_at", { ascending: false });

    return (data ?? []).map((r) => ({
        ...r,
        profiles: (r.profiles ?? null) as Profile | null,
    }));
}

/** Team member user IDs for a sport. */
export async function getTeamMembers(sport: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from("sport_roles")
        .select("user_id")
        .eq("sport", sport)
        .eq("is_team_member", true);

    return new Set((data ?? []).map((m) => m.user_id));
}

/** Current user's access request status for a sport. */
export async function getUserAccessRequestStatus(
    userId: string,
    sport: string,
): Promise<AccessRequestStatus | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("team_access_requests")
        .select("status")
        .eq("user_id", userId)
        .eq("sport", sport)
        .single();

    return (data?.status as AccessRequestStatus) ?? null;
}

/** Current user's signup statuses for a list of sessions. */
export async function getUserSignupStatuses(
    userId: string,
    sessionIds: string[],
): Promise<Map<string, SignupStatus>> {
    if (sessionIds.length === 0) return new Map();
    const supabase = await createClient();
    const { data } = await supabase
        .from("signups")
        .select("session_id, status")
        .eq("user_id", userId)
        .in("session_id", sessionIds)
        .neq("status", "cancelled");

    return new Map(
        (data ?? []).map((s) => [s.session_id, s.status as SignupStatus]),
    );
}

/** Current user's signup status for a single session. */
export async function getUserSignupStatus(
    userId: string,
    sessionId: string,
): Promise<SignupStatus | null> {
    const supabase = await createClient();
    const { data } = await supabase
        .from("signups")
        .select("status")
        .eq("session_id", sessionId)
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .single();

    return (data?.status as SignupStatus) ?? null;
}
