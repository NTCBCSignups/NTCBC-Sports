import { createClient } from "@/lib/supabase/server";

const SPORT = "softball";
const GAME_CODE_REGEX = /Game Code:\s*(\S+)/;

export interface ScheduledGameSession {
  id: string;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location_name: string;
  notes: string | null;
  status: string;
  gamecode: string;
}

/** All softball scheduled_game sessions with extracted gamecodes. */
export async function getScheduledGameSessions(): Promise<ScheduledGameSession[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("id, title, date, time_start, time_end, location_name, notes, status")
    .eq("sport", SPORT)
    .eq("session_type", "scheduled_game");

  if (!data) return [];

  const sessions: ScheduledGameSession[] = [];
  for (const s of data) {
    const match = s.notes?.match(GAME_CODE_REGEX);
    if (match?.[1]) {
      sessions.push({ ...s, gamecode: match[1] });
    }
  }
  return sessions;
}

/** Most recent CCSA sync timestamp. */
export async function getCcsaLastSyncedAt(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ccsa_players")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.synced_at ?? null;
}

/** All CCSA players with contact info and waiver status. */
export async function getCcsaPlayers() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("ccsa_players")
    .select("email, first_name, last_name, waiver_status");

  return (data ?? []).map((p) => ({
    email: p.email,
    first_name: p.first_name,
    last_name: p.last_name,
    waiver_status: p.waiver_status,
  }));
}

/** All user profiles (name and email). */
export async function getAllProfiles() {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name, email");

  return (data ?? []).map((p) => ({
    email: p.email ?? "",
    full_name: p.full_name ?? "",
  }));
}

/** Team members for a sport with profile info. */
export async function getTeamMembersWithProfiles(sport: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("sport_roles")
    .select("user_id, is_team_member, profiles!sport_roles_user_id_fkey(full_name, email)")
    .eq("sport", sport)
    .eq("is_team_member", true);

  return (data ?? []).map((m) => ({
    email: (m.profiles as unknown as { email: string | null })?.email ?? "",
    full_name: (m.profiles as unknown as { full_name: string })?.full_name ?? "",
  }));
}
