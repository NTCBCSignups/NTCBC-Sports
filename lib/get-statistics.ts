import { createClient } from "@/lib/supabase/server";
import { getTodayInSportTimezone } from "@/lib/timezone";
import { getResolvedSportConfig } from "@/lib/get-sport-config";

// ── Types ────────────────────────────────────────────────────────

/** Minimal row shape returned to the client for all stats computation. */
export interface SignupRow {
  sessionId: string;
  sessionDate: string;
  sessionType: string;
  userId: string;
  userName: string;
  playerCap: number | null;
}

export interface SessionRow {
  id: string;
  date: string;
  sessionType: string;
  playerCap: number | null;
}

export interface StatsData {
  sessions: SessionRow[];
  signupRows: SignupRow[];
  users: Array<{ id: string; name: string }>;
  /** Maps session_type value → display label (from sport config tabs) */
  typeLabels: Record<string, string>;
}

// ── Query ────────────────────────────────────────────────────────

/** Fetches all data needed for statistics. All computation happens client-side. */
export async function getStatsData(sport: string): Promise<StatsData> {
  const supabase = await createClient();
  const today = getTodayInSportTimezone();

  const [{ data: sessions }, { data: signups }, { data: roleUsers }, config] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, session_type, player_cap")
      .eq("sport", sport)
      .eq("status", "active")
      .lte("date", today),
    supabase
      .from("signups")
      .select(
        "user_id, session_id, sessions!inner(sport, date, session_type, player_cap), profiles(full_name, email)",
      )
      .eq("sessions.sport", sport)
      .lte("sessions.date", today)
      .in("status", ["confirmed", "waitlisted"]),
    supabase
      .from("sport_roles")
      .select("user_id, profiles!sport_roles_user_id_fkey(id, full_name, email)")
      .eq("sport", sport),
    getResolvedSportConfig(sport),
  ]);

  const sessionRows: SessionRow[] = (sessions ?? []).map((s) => ({
    id: s.id,
    date: s.date,
    sessionType: s.session_type,
    playerCap: s.player_cap,
  }));

  const signupRows: SignupRow[] = (signups ?? []).map((s) => {
    const sess = s.sessions as unknown as {
      date: string;
      session_type: string;
      player_cap: number | null;
    };
    const profile = s.profiles as unknown as { full_name: string | null; email: string } | null;
    return {
      sessionId: s.session_id,
      sessionDate: sess.date,
      sessionType: sess.session_type,
      userId: s.user_id,
      userName: profile?.full_name ?? profile?.email ?? "Unknown",
      playerCap: sess.player_cap,
    };
  });

  // Build deduplicated user list from sport_roles + signups
  const userMap = new Map<string, string>();
  for (const r of roleUsers ?? []) {
    const p = r.profiles as unknown as {
      id: string;
      full_name: string | null;
      email: string;
    } | null;
    if (p) userMap.set(p.id, p.full_name ?? p.email);
  }
  // Also include users who have confirmed/waitlisted signups (same as People tab)
  for (const s of signupRows) {
    if (!userMap.has(s.userId)) userMap.set(s.userId, s.userName);
  }

  const users = [...userMap.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  // Map session_type values to display labels from sport config
  const typeLabels: Record<string, string> = {};
  if (config) {
    for (const tab of config.tabs) {
      typeLabels[tab.value] = tab.label;
    }
  }

  return { sessions: sessionRows, signupRows, users, typeLabels };
}
