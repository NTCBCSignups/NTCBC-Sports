import { createClient } from "@/lib/supabase/server";

// ── Types ────────────────────────────────────────────────────────

export interface SportStatistics {
  summary: {
    totalSessions: number;
    uniqueAttendees: number;
    avgAttendance: number;
    avgFillRate: number | null; // null if no capped sessions
  };
  attendanceTrend: Array<{ week: string; count: number }>;
  sessionTypeStats: Array<{
    type: string;
    sessionCount: number;
    avgAttendance: number;
  }>;
  engagement: {
    activeCount: number;
    inactiveCount: number;
    topAttendees: Array<{ name: string; count: number }>;
  };
  growth: Array<{ month: string; newMembers: number }>;
}

// ── Query ────────────────────────────────────────────────────────

export async function getStatistics(sport: string): Promise<SportStatistics> {
  const supabase = await createClient();

  // Fetch all sessions and signups in parallel
  const [{ data: sessions }, { data: signups }] = await Promise.all([
    supabase
      .from("sessions")
      .select("id, date, session_type, player_cap, status")
      .eq("sport", sport)
      .eq("status", "active"),
    supabase
      .from("signups")
      .select("user_id, session_id, status, created_at, sessions!inner(sport, date), profiles(full_name, email)")
      .eq("sessions.sport", sport)
      .in("status", ["confirmed", "waitlisted"]),
  ]);

  const allSessions = sessions ?? [];
  const allSignups = signups ?? [];

  // ── Summary cards ────────────────────────────────────────────

  const totalSessions = allSessions.length;
  const uniqueAttendees = new Set(allSignups.map((s) => s.user_id)).size;
  const avgAttendance = totalSessions > 0 ? allSignups.length / totalSessions : 0;

  // Fill rate: avg(signups / player_cap) for capped sessions
  const cappedSessions = allSessions.filter((s) => s.player_cap != null && s.player_cap > 0);
  let avgFillRate: number | null = null;
  if (cappedSessions.length > 0) {
    const signupsBySession = new Map<string, number>();
    for (const s of allSignups) {
      signupsBySession.set(s.session_id, (signupsBySession.get(s.session_id) ?? 0) + 1);
    }
    const rates = cappedSessions.map((s) => {
      const count = signupsBySession.get(s.id) ?? 0;
      return count / s.player_cap!;
    });
    avgFillRate = rates.reduce((a, b) => a + b, 0) / rates.length;
  }

  // ── Attendance trend (last 12 weeks) ─────────────────────────

  const now = new Date();
  const twelveWeeksAgo = new Date(now);
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

  const weekMap = new Map<string, number>();
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(twelveWeeksAgo);
    weekStart.setDate(weekStart.getDate() + i * 7);
    const key = weekStart.toISOString().split("T")[0]!;
    weekMap.set(key, 0);
  }

  for (const s of allSignups) {
    const sessionDate = (s.sessions as unknown as { date: string }).date;
    const d = new Date(sessionDate);
    if (d >= twelveWeeksAgo) {
      // Find which week bucket
      const diff = Math.floor((d.getTime() - twelveWeeksAgo.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const weekIdx = Math.min(diff, 11);
      const weekStart = new Date(twelveWeeksAgo);
      weekStart.setDate(weekStart.getDate() + weekIdx * 7);
      const key = weekStart.toISOString().split("T")[0]!;
      weekMap.set(key, (weekMap.get(key) ?? 0) + 1);
    }
  }

  const attendanceTrend = [...weekMap.entries()].map(([week, count]) => ({ week, count }));

  // ── Session type popularity ──────────────────────────────────

  const typeSessionCount = new Map<string, number>();
  const typeSignupCount = new Map<string, number>();

  for (const s of allSessions) {
    typeSessionCount.set(s.session_type, (typeSessionCount.get(s.session_type) ?? 0) + 1);
  }

  const sessionTypeMap = new Map(allSessions.map((s) => [s.id, s.session_type]));
  for (const s of allSignups) {
    const type = sessionTypeMap.get(s.session_id);
    if (type) {
      typeSignupCount.set(type, (typeSignupCount.get(type) ?? 0) + 1);
    }
  }

  const sessionTypeStats = [...typeSessionCount.entries()].map(([type, sessionCount]) => ({
    type,
    sessionCount,
    avgAttendance: sessionCount > 0 ? (typeSignupCount.get(type) ?? 0) / sessionCount : 0,
  }));

  // ── Member engagement ────────────────────────────────────────

  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split("T")[0]!;

  const recentAttendees = new Set<string>();
  const allAttendees = new Set<string>();
  const attendeeCount = new Map<string, number>();
  const attendeeNames = new Map<string, string>();

  for (const s of allSignups) {
    allAttendees.add(s.user_id);
    attendeeCount.set(s.user_id, (attendeeCount.get(s.user_id) ?? 0) + 1);

    const sessionDate = (s.sessions as unknown as { date: string }).date;
    if (sessionDate >= thirtyDaysAgoStr) {
      recentAttendees.add(s.user_id);
    }

    // Track name
    if (!attendeeNames.has(s.user_id)) {
      const profile = s.profiles as unknown as { full_name: string | null; email: string } | null;
      attendeeNames.set(s.user_id, profile?.full_name ?? profile?.email ?? "Unknown");
    }
  }

  const topAttendees = [...attendeeCount.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([userId, count]) => ({ name: attendeeNames.get(userId) ?? "Unknown", count }));

  // ── Growth (new members per month, last 6 months) ────────────

  const sixMonthsAgo = new Date(now);
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const firstSignupByUser = new Map<string, string>();
  for (const s of allSignups) {
    const sessionDate = (s.sessions as unknown as { date: string }).date;
    const existing = firstSignupByUser.get(s.user_id);
    if (!existing || sessionDate < existing) {
      firstSignupByUser.set(s.user_id, sessionDate);
    }
  }

  const monthMap = new Map<string, number>();
  for (let i = 0; i < 6; i++) {
    const m = new Date(sixMonthsAgo);
    m.setMonth(m.getMonth() + i);
    const key = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, "0")}`;
    monthMap.set(key, 0);
  }

  for (const [, firstDate] of firstSignupByUser) {
    const key = firstDate.slice(0, 7); // "YYYY-MM"
    if (monthMap.has(key)) {
      monthMap.set(key, monthMap.get(key)! + 1);
    }
  }

  const growth = [...monthMap.entries()].map(([month, newMembers]) => ({ month, newMembers }));

  return {
    summary: { totalSessions, uniqueAttendees, avgAttendance, avgFillRate },
    attendanceTrend,
    sessionTypeStats,
    engagement: {
      activeCount: recentAttendees.size,
      inactiveCount: allAttendees.size - recentAttendees.size,
      topAttendees,
    },
    growth,
  };
}
