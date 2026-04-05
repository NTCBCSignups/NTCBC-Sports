"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { installEphemeralCookieFetch } from "@/lib/ccsa-server-fetch";
import { auth, team } from "@/lib/ccsa-api";
import type { WaiverStatus } from "@/lib/supabase/types";

const SPORT = "softball";

async function requireSportAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") return user;

  const { data: sportRole } = await supabase
    .from("sport_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("sport", SPORT)
    .single();

  if (sportRole?.role === "admin") return user;

  throw new Error("Not authorized");
}

function mapWaiverStatus(needwaiver: false | "paper" | "online"): WaiverStatus {
  if (needwaiver === false) return "valid";
  if (needwaiver === "paper") return "needs_paper";
  return "needs_online";
}

export async function requestCcsaLogin(email: string) {
  await requireSportAdmin();

  installEphemeralCookieFetch();
  try {
    await auth.requestLoginCode(email, "email");
    return { success: true };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Failed to send login code" };
  }
}

export async function loginAndSyncCcsaWaivers(email: string, otp: string) {
  await requireSportAdmin();

  installEphemeralCookieFetch();
  try {
    await auth.postLogin(email, otp);

    const userTeam = await team.userTeam();
    const teamId = userTeam?.teamid;
    if (!teamId) {
      return { error: "Could not determine CCSA team ID" };
    }

    const players = await team.allPlayerInfo(teamId);
    if (!players || players.length === 0) {
      return { error: "No players found on CCSA team" };
    }

    const admin = createAdminClient();
    const now = new Date().toISOString();

    const rows = players.map((p) => ({
      email: p.email.toLowerCase(),
      ccsa_player_id: p.playerid,
      first_name: p.firstname,
      last_name: p.lastname,
      waiver_status: mapWaiverStatus(p.needwaiver),
      synced_at: now,
    }));

    const { error: upsertError } = await admin
      .from("ccsa_players")
      .upsert(rows, { onConflict: "email" });

    if (upsertError) {
      return { error: upsertError.message };
    }

    revalidatePath(`/${SPORT}/admin`);
    revalidatePath(`/${SPORT}`);
    return { success: true, count: players.length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Sync failed" };
  }
}

export async function approveCcsaPlayersForTeam() {
  const user = await requireSportAdmin();

  const admin = createAdminClient();

  const { data: ccsaPlayers, error: fetchError } = await admin
    .from("ccsa_players")
    .select("email");

  if (fetchError || !ccsaPlayers) {
    return { error: fetchError?.message ?? "No CCSA players found" };
  }

  const emails = ccsaPlayers.map((p) => p.email);

  // Find matching profiles
  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, email")
    .in("email", emails);

  if (profileError || !profiles) {
    return { error: profileError?.message ?? "Could not look up profiles" };
  }

  let approvedCount = 0;

  for (const profile of profiles) {
    // Upsert sport_roles with is_team_member = true
    const { data: existing } = await admin
      .from("sport_roles")
      .select("id")
      .eq("user_id", profile.id)
      .eq("sport", SPORT)
      .maybeSingle();

    if (existing) {
      await admin
        .from("sport_roles")
        .update({ is_team_member: true })
        .eq("id", existing.id);
    } else {
      await admin.from("sport_roles").insert({
        user_id: profile.id,
        sport: SPORT,
        is_team_member: true,
      });
    }

    // Auto-approve any pending team_access_requests
    await admin
      .from("team_access_requests")
      .update({
        status: "approved",
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("user_id", profile.id)
      .eq("sport", SPORT)
      .eq("status", "pending");

    approvedCount++;
  }

  revalidatePath(`/${SPORT}/admin`);
  revalidatePath(`/${SPORT}`);
  return { success: true, count: approvedCount };
}
