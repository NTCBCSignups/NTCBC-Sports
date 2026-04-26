"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoteOneFromWaitlist, resolveSignupStatus } from "@/lib/signup-capacity";
import { sportsConfig, isRestrictedSessionType } from "@/lib/sports-config";
import { getUserSportRole, getUser, requireSportAdmin } from "@/lib/supabase/user";

const SPORT = "softball";

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

  const sportConfig = sportsConfig[session.sport];

  if (isRestrictedSessionType(sportConfig, session.session_type)) {
    const { isTeamMember } = await getUserSportRole(supabase, user.id, session.sport);

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
    return { error: "Already signed up" };
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

    revalidatePath(`/${SPORT}/session/${sessionId}`);
    revalidatePath(`/${SPORT}`);
    return { success: true };
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

  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}`);
  return { success: true };
}

export async function cancelSignup(sessionId: string) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: row, error: fetchError } = await supabase
    .from("signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (fetchError) return { error: fetchError.message };
  if (!row || row.status === "cancelled") {
    revalidatePath(`/${SPORT}/session/${sessionId}`);
    revalidatePath(`/${SPORT}`);
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
  const result = await requireSportAdmin(supabase, SPORT);
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

  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}/admin`);
  return { success: true };
}
