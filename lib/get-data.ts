import { createClient } from "@/lib/supabase/server";
import { getTodayInSportTimezone } from "@/lib/timezone";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRequestStatus,
  Profile,
  SignupStatus,
  SportSession,
} from "@/lib/supabase/types";
import type { SportConfigDbRow, SportConfigPayload } from "@/config/config-resolver";

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
    .order("date", { ascending: true })
    .order("time_start", { ascending: true })
    .returns<(SportSession & { signups: [{ count: number }] })[]>();

  return (data ?? []).map((s) => ({
    ...s,
    signup_count: s.signups[0]?.count ?? 0,
  }));
}

/** All sessions for admin view (upcoming + past). */
export async function getAllSessions(sport: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("sport", sport)
    .order("date", { ascending: false })
    .order("time_start", { ascending: true });

  return data ?? [];
}

/** Sessions for a sport using a provided client (e.g., admin client for API routes). */
export async function getSessionsWithClient(
  supabase: SupabaseClient,
  sport: string,
  options?: { includeHistory?: boolean; fromDate?: string },
): Promise<SportSession[]> {
  let query = supabase.from("sessions").select("*").eq("sport", sport);

  if (!options?.includeHistory) {
    query = query.gte("date", options?.fromDate ?? getTodayInSportTimezone());
  }

  const { data } = await query
    .order("date", { ascending: true })
    .order("time_start", { ascending: true })
    .returns<SportSession[]>();

  return data ?? [];
}

/** Single session by ID. */
export async function getSession(sessionId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("sessions").select("*").eq("id", sessionId).single();

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

/** Users with a sport_role for a sport (for facilitator dropdown). */
export async function getSportUsers(sport: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sport_roles")
    .select("user_id, profiles!sport_roles_user_id_fkey(id, full_name, email)")
    .eq("sport", sport);

  return (data ?? [])
    .map((r) => {
      const p = r.profiles as unknown as Profile | null;
      return p ? { id: p.id, name: p.full_name ?? p.email } : null;
    })
    .filter((u): u is { id: string; name: string } => u !== null)
    .sort((a, b) => a.name.localeCompare(b.name));
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

  return new Map((data ?? []).map((s) => [s.session_id, s.status as SignupStatus]));
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

function normalizeSportConfigPayload(payload: unknown): SportConfigPayload {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return {};
  }
  return payload as SportConfigPayload;
}

function mapSportConfigRow(row: {
  id: string;
  auth_enabled: boolean;
  emoji: string;
  name: string;
  type: string;
  description: string | null;
  config: unknown;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}): SportConfigDbRow {
  return {
    id: row.id,
    auth_enabled: row.auth_enabled,
    emoji: row.emoji,
    name: row.name,
    type: row.type,
    description: row.description,
    config: normalizeSportConfigPayload(row.config),
    updated_by: row.updated_by,
    updated_at: row.updated_at,
    created_at: row.created_at,
  };
}

/** Single sport config row by sport id. */
export async function getSportConfigRow(sport: string): Promise<SportConfigDbRow | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sport_configs")
    .select(
      "id, auth_enabled, emoji, name, type, description, config, updated_by, updated_at, created_at",
    )
    .eq("id", sport)
    .maybeSingle();

  if (error || !data) return null;
  return mapSportConfigRow(data);
}

/** All sport config rows. */
export async function getSportConfigRows(): Promise<SportConfigDbRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sport_configs")
    .select(
      "id, auth_enabled, emoji, name, type, description, config, updated_by, updated_at, created_at",
    )
    .order("created_at", { ascending: true });

  if (error || !data) return [];
  return data.map((row) => mapSportConfigRow(row));
}
