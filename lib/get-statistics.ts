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

export interface CalendarUsageRow {
  userId: string;
  userName: string;
  mode: "subscribe" | "download";
  createdAt: string;
  lastUsedAt: string;
}

export interface StatsData {
  sessions: SessionRow[];
  signupRows: SignupRow[];
  /** Only populated in trend mode (no userId filter). Empty in personal mode. */
  users: Array<{ id: string; name: string }>;
  /** Maps session_type value → display label (from sport config tabs) */
  typeLabels: Record<string, string>;
  /** Calendar usage rows — only populated in admin/trend mode. */
  calendarUsage: CalendarUsageRow[];
}

// ── Query ────────────────────────────────────────────────────────

/**
 * Fetches data for statistics. All computation happens client-side.
 * @param sport - Sport identifier
 * @param userId - When provided, only fetches that user's signups (personal mode).
 *                 When omitted, fetches all signups + user list (trend/admin mode).
 */
export async function getStatsData(sport: string, userId?: string): Promise<StatsData> {
  const supabase = await createClient();
  const today = getTodayInSportTimezone();

  // Build signups query — optionally scoped to one user
  let signupsQuery = supabase
    .from("signups")
    .select(
      "user_id, session_id, sessions!inner(sport, date, session_type, player_cap, status), profiles(full_name, email)",
    )
    .eq("sessions.sport", sport)
    .eq("sessions.status", "active")
    .lte("sessions.date", today)
    .in("status", ["confirmed", "waitlisted"]);

  if (userId) {
    signupsQuery = signupsQuery.eq("user_id", userId);
  }

  // Parallelize: sessions + signups + config always; user list only in trend mode; calendar always
  const [{ data: sessions }, { data: signups }, roleUsersResult, config, calendarResult] =
    await Promise.all([
      supabase
        .from("sessions")
        .select("id, date, session_type, player_cap")
        .eq("sport", sport)
        .eq("status", "active")
        .lte("date", today),
      signupsQuery,
      userId
        ? Promise.resolve({ data: null })
        : supabase
            .from("sport_roles")
            .select("user_id, profiles!sport_roles_user_id_fkey(id, full_name, email)")
            .eq("sport", sport),
      getResolvedSportConfig(sport),
      (() => {
        let q = supabase
          .from("calendar_tracking")
          .select("user_id, mode, created_at, last_used_at, profiles!inner(full_name, email)")
          .eq("sport", sport);
        if (userId) q = q.eq("user_id", userId);
        return q;
      })(),
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
    const profile = s.profiles as unknown as {
      full_name: string | null;
      email: string | null;
    } | null;
    return {
      sessionId: s.session_id,
      sessionDate: sess.date,
      sessionType: sess.session_type,
      userId: s.user_id,
      userName: profile?.full_name ?? profile?.email ?? "Unknown",
      playerCap: sess.player_cap,
    };
  });

  // Build deduplicated user list (only in trend mode)
  const userMap = new Map<string, string>();
  const roleUsers = roleUsersResult.data;
  if (roleUsers) {
    for (const r of roleUsers) {
      const p = r.profiles as unknown as {
        id: string;
        full_name: string | null;
        email: string | null;
      } | null;
      if (p) userMap.set(p.id, p.full_name ?? p.email ?? "Unknown");
    }
    for (const s of signupRows) {
      if (!userMap.has(s.userId)) userMap.set(s.userId, s.userName);
    }
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

  // Transform calendar tracking rows
  const calendarUsage: CalendarUsageRow[] = (calendarResult.data ?? []).map((row) => {
    const profile = row.profiles as unknown as {
      full_name: string | null;
      email: string | null;
    };
    return {
      userId: row.user_id,
      userName: profile.full_name ?? profile.email ?? "Unknown",
      mode: row.mode as "subscribe" | "download",
      createdAt: row.created_at,
      lastUsedAt: row.last_used_at,
    };
  });

  return { sessions: sessionRows, signupRows, users, typeLabels, calendarUsage };
}
