import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Returns whether signup is currently open for a session based on its
 * `signup_open` and `signup_close` timestamps.
 */
export function isSignupOpen(session: { signup_open: string; signup_close: string }): boolean {
  const now = new Date();
  return now >= new Date(session.signup_open) && now <= new Date(session.signup_close);
}

/**
 * Decides confirmed vs waitlisted for a new or reactivated signup.
 * Uses a Postgres function with FOR UPDATE to atomically serialize concurrent signups,
 * preventing the TOCTOU race where two users both read count < cap.
 */
export async function resolveSignupStatus(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<"confirmed" | "waitlisted"> {
  const { data, error } = await supabase.rpc("resolve_signup_status", {
    p_session_id: sessionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data as "confirmed" | "waitlisted";
}

/**
 * After a confirmed player drops out, promote the earliest waitlisted player if there is room.
 * `supabase` must be able to update any signup for this session (service role or sport admin).
 */
export async function promoteOneFromWaitlist(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ error?: string }> {
  // Fetch session cap, confirmed count, and first waitlisted player in parallel
  const [
    { data: session, error: sessionError },
    { count, error: countError },
    { data: next, error: nextError },
  ] = await Promise.all([
    supabase.from("sessions").select("player_cap").eq("id", sessionId).single(),
    supabase
      .from("signups")
      .select("*", { count: "exact", head: true })
      .eq("session_id", sessionId)
      .eq("status", "confirmed"),
    supabase
      .from("signups")
      .select("id")
      .eq("session_id", sessionId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Session not found" };
  }
  if (countError) return { error: countError.message };
  if (nextError) return { error: nextError.message };
  if (!next) return {};

  // No cap or room available — promote
  if (session.player_cap == null || (count ?? 0) < session.player_cap) {
    const { error: upError } = await supabase
      .from("signups")
      .update({ status: "confirmed" })
      .eq("id", next.id);

    return upError ? { error: upError.message } : {};
  }

  return {};
}
