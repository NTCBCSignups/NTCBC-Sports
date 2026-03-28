import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Decides confirmed vs waitlisted for a new or reactivated signup (same rules as the old DB trigger).
 * Caller must use a client that can read `sessions` and `signups` for this session.
 */
export async function resolveSignupStatus(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<"confirmed" | "waitlisted"> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("player_cap")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    throw new Error(sessionError?.message ?? "Session not found");
  }

  if (session.player_cap == null) {
    return "confirmed";
  }

  const { count, error: countError } = await supabase
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  if (countError) {
    throw new Error(countError.message);
  }

  return (count ?? 0) >= session.player_cap ? "waitlisted" : "confirmed";
}

/**
 * After a confirmed player drops out, promote the earliest waitlisted player if there is room.
 * `supabase` must be able to update any signup for this session (service role or sport admin).
 */
export async function promoteOneFromWaitlist(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ error?: string }> {
  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("player_cap")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return { error: sessionError?.message ?? "Session not found" };
  }

  if (session.player_cap == null) {
    const { data: next, error: nextError } = await supabase
      .from("signups")
      .select("id")
      .eq("session_id", sessionId)
      .eq("status", "waitlisted")
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (nextError) return { error: nextError.message };
    if (!next) return {};

    const { error: upError } = await supabase
      .from("signups")
      .update({ status: "confirmed" })
      .eq("id", next.id);

    return upError ? { error: upError.message } : {};
  }

  const { count, error: countError } = await supabase
    .from("signups")
    .select("*", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("status", "confirmed");

  if (countError) return { error: countError.message };

  if ((count ?? 0) >= session.player_cap) {
    return {};
  }

  const { data: next, error: nextError } = await supabase
    .from("signups")
    .select("id")
    .eq("session_id", sessionId)
    .eq("status", "waitlisted")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (nextError) return { error: nextError.message };
  if (!next) return {};

  const { error: upError } = await supabase
    .from("signups")
    .update({ status: "confirmed" })
    .eq("id", next.id);

  return upError ? { error: upError.message } : {};
}
