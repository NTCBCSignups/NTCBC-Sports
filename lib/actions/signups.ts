"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { promoteOneFromWaitlist, resolveSignupStatus } from "@/lib/signup-capacity";
import { getResolvedTab } from "@/config/config-resolver";
import { canSignup } from "@/lib/tab-access";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getSessionPath } from "@/lib/session-route";
import { getUserSportRole, getUser, requireSportAdmin } from "@/lib/supabase/user";

export interface SignupPlacement {
  status: "confirmed" | "waitlisted";
  position: number | null;
  playerCap: number | null;
}

export type SignupActionResult = { error: string } | ({ success: true } & SignupPlacement);

export type CancelSignupResult = { error: string } | { success: true };

export type AdminSignupActionResult = { error: string } | { success: true };

async function getSessionSport(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
) {
  const { data } = await supabase.from("sessions").select("sport").eq("id", sessionId).single();
  return data?.sport ?? null;
}

async function getSignupPlacement(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sessionId: string,
  userId: string,
  status: "confirmed" | "waitlisted",
): Promise<SignupPlacement> {
  const [{ data: session }, { data: signups }] = await Promise.all([
    supabase.from("sessions").select("player_cap").eq("id", sessionId).single(),
    supabase
      .from("signups")
      .select("user_id")
      .eq("session_id", sessionId)
      .eq("status", status)
      .order("created_at", { ascending: true }),
  ]);

  const position = signups?.findIndex((signup) => signup.user_id === userId) ?? -1;

  return {
    status,
    position: position >= 0 ? position + 1 : null,
    playerCap: status === "confirmed" ? (session?.player_cap ?? null) : null,
  };
}

export async function signUpForSession(sessionId: string): Promise<SignupActionResult> {
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
  const sportConfig = await getResolvedSportConfig(sport);
  if (!sportConfig) return { error: "Sport config not found" };
  const tab = getResolvedTab(sportConfig, session.session_type);

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (!canSignup(tab, role)) {
    return { error: "You don't have permission to sign up for this session" };
  }

  const { data: existingSignup } = await supabase
    .from("signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Already actively signed up — return current placement
  if (existingSignup?.status === "confirmed" || existingSignup?.status === "waitlisted") {
    return {
      success: true,
      ...(await getSignupPlacement(supabase, sessionId, user.id, existingSignup.status)),
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

  if (existingSignup) {
    // Override whatever inactive status they had
    const { error: updateError } = await supabase
      .from("signups")
      .update({ status, created_at: new Date().toISOString() })
      .eq("id", existingSignup.id);

    if (updateError) return { error: updateError.message };
  } else {
    const { error } = await supabase.from("signups").insert({
      session_id: sessionId,
      user_id: user.id,
      status,
    });

    if (error) {
      if (error.code === "23505") return { error: "Already signed up" };
      return { error: error.message };
    }
  }

  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}`);
  return {
    success: true,
    ...(await getSignupPlacement(supabase, sessionId, user.id, status)),
  };
}

export async function cancelSignup(sessionId: string): Promise<CancelSignupResult> {
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
    revalidatePath(getSessionPath(sport, sessionId));
    revalidatePath(`/${sport}`);
    return { success: true };
  }

  const wasConfirmed = row.status === "confirmed";

  const { error } = await supabase.from("signups").update({ status: "cancelled" }).eq("id", row.id);

  if (error) return { error: error.message };

  if (wasConfirmed) {
    try {
      const admin = createAdminClient();
      const { error: promoError } = await promoteOneFromWaitlist(admin, sessionId);
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

  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function declineSession(sessionId: string): Promise<CancelSignupResult> {
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
  const sportConfig = await getResolvedSportConfig(sport);
  if (!sportConfig) return { error: "Sport config not found" };
  const tab = getResolvedTab(sportConfig, session.session_type);

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (!canSignup(tab, role)) {
    return { error: "You don't have permission to respond to this session" };
  }

  const { data: existingSignup } = await supabase
    .from("signups")
    .select("id, status")
    .eq("session_id", sessionId)
    .eq("user_id", user.id)
    .maybeSingle();

  // Already declined — no-op
  if (existingSignup?.status === "declined") {
    return { success: true };
  }

  if (existingSignup) {
    const wasConfirmed = existingSignup.status === "confirmed";

    const { error } = await supabase
      .from("signups")
      .update({ status: "declined" })
      .eq("id", existingSignup.id);

    if (error) return { error: error.message };

    if (wasConfirmed) {
      try {
        const admin = createAdminClient();
        const { error: promoError } = await promoteOneFromWaitlist(admin, sessionId);
        if (promoError) return { error: promoError };
      } catch (e) {
        return {
          error: e instanceof Error ? e.message : "Could not promote waitlist",
        };
      }
    }
  } else {
    const { error } = await supabase.from("signups").insert({
      session_id: sessionId,
      user_id: user.id,
      status: "declined",
    });

    if (error) return { error: error.message };
  }

  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function adminUpdateSignupStatus(
  sport: string,
  signupId: string,
  status: "confirmed" | "waitlisted" | "cancelled",
  sessionId: string,
): Promise<AdminSignupActionResult> {
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

  const { error } = await supabase.from("signups").update({ status }).eq("id", signupId);

  if (error) return { error: error.message };

  if (before.status === "confirmed" && status === "cancelled") {
    const { error: promoError } = await promoteOneFromWaitlist(supabase, before.session_id);
    if (promoError) return { error: promoError };
  }

  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}
