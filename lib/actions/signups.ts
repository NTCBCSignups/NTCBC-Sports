"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoteOneFromWaitlist, resolveSignupStatus } from "@/lib/signup-capacity";
import { sportsConfig, isRestrictedSessionType } from "@/config/sports-config";
import { getUserSportRole, getUser, requireSportAdmin } from "@/lib/supabase/user";

async function getSessionSport(supabase: Awaited<ReturnType<typeof createClient>>, sessionId: string) {
  const { data } = await supabase
    .from("sessions")
    .select("sport")
    .eq("id", sessionId)
    .single();
  return data?.sport ?? null;
}

async function getSignupPlacement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
  status: "confirmed" | "waitlisted",
) {
  const [{ data: session }, { data: signups }] = await Promise.all([
    supabase
      .from("sessions")
      .select("player_cap")
      .eq("id", sessionId)
      .single(),
    supabase
      .from("signups")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("status", status)
      .order("created_at", { ascending: true }),
  ]);

  const position =
    signups?.findIndex((signup) => signup.user_id === userId) ?? -1;

  return {
    status,
    position: position >= 0 ? position + 1 : null,
    playerCap: status === "confirmed" ? session?.player_cap ?? null : null,
  };
}

export async function signUpForSession(sessionId: string) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: session } = await supabase
    .from("sessions")
    .select("session_type, sport")
    .eq("id", sessionId)
    .single();

  if (!session) return { error: "Session not found" };

  const sport = session.sport;
  const sportConfig = sportsConfig[sport];

  if (isRestrictedSessionType(sportConfig, session.session_type)) {
    const { isTeamMember } = await getUserSportRole(supabase, user.id, sport);

    if (!isTeamMember) {
      return { error: "Only team members can sign up for scheduled games" };
    }
  }

  const { data: existingSignup } = await supabase
    .from("signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (
    existingSignup?.status &&
    existingSignup.status !== "cancelled"
  ) {
    return {
      success: true,
      ...(await getSignupPlacement(
        supabase,
        sessionId,
        user.id,
        existingSignup.status as "confirmed" | "waitlisted",
      )),
    };
  }

  let status: "confirmed" | "waitlisted";
  try {
    status = await resolveSignupStatus(supabase, sessionId);
  } catch (e) {
    return {
      error: e instanceof Error ? e.message : "Could not resolve signup status",
    };
  }

  if (existingSignup?.status === "cancelled") {
    const { error: reactivateError } = await supabase
      .from("signups")
      .update({ status, created_at: new Date().toISOString() })
      .eq("id", existingSignup.id);

    if (reactivateError) return { error: reactivateError.message };

    revalidatePath(`/${sport}/session/${sessionId}`);
    revalidatePath(`/${sport}`);
    return {
      success: true,
      ...(await getSignupPlacement(supabase, sessionId, user.id, status)),
    };
  }

  const { error } = await supabase.from("signups").insert({
    session_id: sessionId,
    user_id: user.id,
    status,
  });

  if (error) {
    if (error.code === "23505") return { error: "Already signed up" };
    return { error: error.message };
  }

  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}`);
  return {
    success: true,
    ...(await getSignupPlacement(supabase, sessionId, user.id, status)),
  };
}

export async function cancelSignup(sessionId: string) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return { error: "Not authenticated" };

  const sport = await getSessionSport(supabase, sessionId);

  const { data: row, error: fetchError } = await supabase
    .from("signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!row || row.status === "cancelled") {
    revalidatePath(`/${sport}/session/${sessionId}`);
    revalidatePath(`/${sport}`);
    return { success: true };
  }

  const wasConfirmed = row.status === "confirmed";

  const { error } = await supabase
    .from("signups")
    .update({ status: "cancelled" })
    .eq("id", row.id);

  if (error) return { error: error.message };

  if (wasConfirmed) {
    try {
      const admin = createAdminClient();
      const { error: promoError } = await promoteOneFromWaitlist(
        admin,
        sessionId,
      );
      if (promoError) return { error: promoError };
    } catch (e) {
      return {
        error:
          e instanceof Error
            ? e.message
            : "Could not promote waitlist (check server configuration)",
      };
    }
  }

  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function adminUpdateSignupStatus(
  sport: string,
  signupId: string,
  status: "confirmed" | "waitlisted" | "cancelled",
  sessionId: string,
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data: before, error: beforeError } = await supabase
    .from("signups")
    .select("session_id, status")
    .eq("id", signupId)
    .single();

  if (beforeError || !before) {
    return { error: beforeError?.message ?? "Signup not found" };
  }

  const { error } = await supabase
    .from("signups")
    .update({ status })
    .eq("id", signupId);

  if (error) return { error: error.message };

  if (before.status === "confirmed" && status === "cancelled") {
    const { error: promoError } = await promoteOneFromWaitlist(
      supabase,
      before.session_id,
    );
    if (promoError) return { error: promoError };
  }

  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}
