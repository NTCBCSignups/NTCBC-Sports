"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const SPORT = "softball";

export async function signUpForSession(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: session } = await supabase
    .from("sessions")
    .select("session_type, sport")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Session not found" };

  if (session.session_type === "scheduled_game") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const { data: sportRole } = await supabase
        .from("sport_roles")
        .select("role, is_team_member")
        .eq("user_id", user.id)
        .eq("sport", session.sport)
        .single();

      if (!sportRole?.is_team_member && sportRole?.role !== "admin") {
        return { error: "Only team members can sign up for scheduled games" };
      }
    }
  }

  const { error } = await supabase.from("signups").insert({
    session_id: sessionId,
    user_id: user.id,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already signed up" };
    return { error: error.message };
  }

  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}`);
  return { success: true };
}

export async function cancelSignup(sessionId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("signups")
    .update({ status: "cancelled" })
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .neq("status", "cancelled");

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}`);
  return { success: true };
}

export async function adminUpdateSignupStatus(
  signupId: string,
  status: "confirmed" | "waitlisted" | "cancelled",
  sessionId: string,
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let isAdmin = profile?.role === "admin";
  if (!isAdmin) {
    const { data: sportRole } = await supabase
      .from("sport_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("sport", SPORT)
      .single();
    isAdmin = sportRole?.role === "admin";
  }

  if (!isAdmin) return { error: "Not authorized" };

  const { error } = await supabase
    .from("signups")
    .update({ status })
    .eq("id", signupId);

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}/admin`);
  return { success: true };
}
