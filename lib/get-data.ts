import { createClient } from "@/lib/supabase/server";
import { getTodayInSportTimezone } from "@/lib/timezone";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AccessRequestStatus,
  Profile,
  SignupStatus,
  SportMember,
  SportRoleType,
  SportSession,
} from "@/lib/supabase/types";
import type { SportConfigDbRow, SportConfigPayload } from "@/config/config-resolver";

// ── Data functions ──────────────────────────────────────────────
// Centralized queries using the user's Supabase client (respects RLS).

/** Upcoming sessions with signup counts for a sport page. */
export async function getUpcomingSessions(sport: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*, signups(count)")
    .eq("sport", sport)
    .neq("signups.status", "cancelled")
    .neq("signups.status", "declined")
    .gte("date", getTodayInSportTimezone())
    .order("date", { ascending: true })
    .order("time_start", { ascending: true })
    .returns<(SportSession & { signups: [{ count: number }] })[]>();

  if (error) console.error("[getUpcomingSessions]", error.message);

  return (data ?? []).map((s) => ({
    ...s,
    signup_count: s.signups[0]?.count ?? 0,
  }));
}

/** All sessions for admin view (upcoming + past). */
export async function getAllSessions(sport: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sessions")
    .select("*")
    .eq("sport", sport)
    .order("date", { ascending: false })
    .order("time_start", { ascending: true });

  if (error) console.error("[getAllSessions]", error.message);

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
  const { data, error } = await supabase.from("sessions").select("*").eq("id", sessionId).single();

  if (error) console.error("[getSession]", error.message);

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

/** Users with a sport_role OR signup for a sport (for facilitator dropdown). */
export async function getSportUsers(sport: string) {
  const supabase = await createClient();

  // Users with an explicit sport_role
  const { data: roleData } = await supabase
    .from("sport_roles")
    .select("user_id, is_team_member, profiles!sport_roles_user_id_fkey(id, full_name, email)")
    .eq("sport", sport);

  // Users who signed up for any session in this sport (may not have a sport_role)
  const { data: signupData } = await supabase
    .from("signups")
    .select("user_id, profiles(id, full_name, email), sessions!inner(sport)")
    .eq("sessions.sport", sport);

  const userMap = new Map<string, { id: string; name: string; isTeamMember: boolean }>();

  for (const r of roleData ?? []) {
    const p = r.profiles as unknown as Profile | null;
    if (p) {
      userMap.set(p.id, { id: p.id, name: p.full_name ?? p.email, isTeamMember: r.is_team_member });
    }
  }

  for (const s of signupData ?? []) {
    const p = s.profiles as unknown as Profile | null;
    if (p && !userMap.has(p.id)) {
      userMap.set(p.id, { id: p.id, name: p.full_name ?? p.email, isTeamMember: false });
    }
  }

  return [...userMap.values()].sort((a, b) => a.name.localeCompare(b.name));
}

/** All members for a sport with activity stats (for Members admin tab). */
export async function getSportMembers(sport: string): Promise<SportMember[]> {
  const supabase = await createClient();

  // 1 & 2: Fetch sport_roles and signup stats in parallel (independent queries)
  const [{ data: roleData }, { data: signupStats }] = await Promise.all([
    supabase
      .from("sport_roles")
      .select(
        "user_id, role, is_team_member, created_at, profiles!sport_roles_user_id_fkey(id, full_name, email, avatar_url, role)",
      )
      .eq("sport", sport),
    supabase
      .from("signups")
      .select("user_id, created_at, sessions!inner(sport)")
      .eq("sessions.sport", sport)
      .neq("status", "cancelled"),
  ]);

  // 3. Users who only have signups (no sport_role) — get their profiles
  const signupUserIds = new Set((signupStats ?? []).map((s) => s.user_id));
  const roleUserIds = new Set((roleData ?? []).map((r) => r.user_id));
  const signupOnlyIds = [...signupUserIds].filter((id) => !roleUserIds.has(id));

  let signupOnlyProfiles: Profile[] = [];
  if (signupOnlyIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url, role, created_at, updated_at")
      .in("id", signupOnlyIds);
    signupOnlyProfiles = (data ?? []) as Profile[];
  }

  // Aggregate signup stats per user
  const statsMap = new Map<string, { count: number; lastDate: string }>();
  for (const s of signupStats ?? []) {
    const existing = statsMap.get(s.user_id);
    if (existing) {
      existing.count++;
      if (s.created_at > existing.lastDate) existing.lastDate = s.created_at;
    } else {
      statsMap.set(s.user_id, { count: 1, lastDate: s.created_at });
    }
  }

  const members: SportMember[] = [];

  // From sport_roles
  for (const r of roleData ?? []) {
    const p = r.profiles as unknown as Profile | null;
    if (!p) continue;
    const stats = statsMap.get(r.user_id);
    members.push({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      sportRole: r.role as SportRoleType,
      isSportAdmin: r.role === "admin",
      isGlobalAdmin: p.role === "admin",
      isTeamMember: r.is_team_member,
      joinedAt: r.created_at,
      totalSignups: stats?.count ?? 0,
      lastActiveDate: stats?.lastDate ?? null,
    });
  }

  // From signups only (no sport_role)
  for (const p of signupOnlyProfiles) {
    const stats = statsMap.get(p.id);
    members.push({
      id: p.id,
      email: p.email,
      fullName: p.full_name,
      avatarUrl: p.avatar_url,
      sportRole: null,
      isSportAdmin: false,
      isGlobalAdmin: p.role === "admin",
      isTeamMember: false,
      joinedAt: null,
      totalSignups: stats?.count ?? 0,
      lastActiveDate: stats?.lastDate ?? null,
    });
  }

  return members.sort((a, b) => {
    const nameA = a.fullName ?? a.email;
    const nameB = b.fullName ?? b.email;
    return nameA.localeCompare(nameB);
  });
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
