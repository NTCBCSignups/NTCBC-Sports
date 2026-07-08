"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import type { SportRoleType } from "@/lib/supabase/types";

// ── Member management actions (admin only) ──────────────────────

export async function updateMemberRole(
  sport: string,
  userId: string,
  updates: { role?: SportRoleType; isTeamMember?: boolean },
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  // Prevent admin from demoting themselves
  if (userId === result.user.id) {
    return { error: "Cannot change your own role" };
  }

  // If setting to "no role" (member + not team member), delete the row entirely
  const effectiveRole = updates.role ?? "member";
  const effectiveTeam = updates.isTeamMember ?? false;
  if (effectiveRole === "member" && !effectiveTeam) {
    const { error } = await supabase
      .from("sport_roles")
      .delete()
      .eq("user_id", userId)
      .eq("sport", sport);

    if (error) return { error: error.message };

    revalidatePath(`/${sport}/admin`);
    return { success: true };
  }

  // Otherwise upsert the role
  const { error } = await supabase
    .from("sport_roles")
    .upsert(
      { user_id: userId, sport, role: effectiveRole, is_team_member: effectiveTeam },
      { onConflict: "user_id,sport" },
    );

  if (error) return { error: error.message };

  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function addMember(
  sport: string,
  userId: string,
  options: { role?: SportRoleType; isTeamMember?: boolean } = {},
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const effectiveRole = options.role ?? "member";
  const effectiveTeam = options.isTeamMember ?? false;

  // Only create a sport_roles row if granting elevated access
  if (effectiveRole !== "member" || effectiveTeam) {
    const { error } = await supabase.from("sport_roles").insert({
      user_id: userId,
      sport,
      role: effectiveRole,
      is_team_member: effectiveTeam,
    });

    if (error) {
      if (error.code === "23505") return { error: "User already has a role in this sport" };
      return { error: error.message };
    }
  }

  // Clean up any pending access request for this user
  await supabase.from("team_access_requests").delete().eq("user_id", userId).eq("sport", sport);

  revalidatePath(`/${sport}/admin`);
  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function removeMember(sport: string, userId: string) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  // Prevent admin from removing themselves
  if (userId === result.user.id) {
    return { error: "Cannot remove yourself" };
  }

  const { error } = await supabase
    .from("sport_roles")
    .delete()
    .eq("user_id", userId)
    .eq("sport", sport);

  if (error) return { error: error.message };

  // Also remove any pending access request
  await supabase.from("team_access_requests").delete().eq("user_id", userId).eq("sport", sport);

  revalidatePath(`/${sport}/admin`);
  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function bulkUpdateMembers(
  sport: string,
  userIds: string[],
  updates: { role?: SportRoleType; isTeamMember?: boolean },
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  if (userIds.length === 0) return { error: "No users selected" };

  // Prevent admin from demoting themselves
  if (userIds.includes(result.user.id)) {
    return { error: "Cannot change your own role" };
  }

  const effectiveRole = updates.role ?? "member";
  const effectiveTeam = updates.isTeamMember ?? false;

  // If setting to "no role", delete the rows
  if (effectiveRole === "member" && !effectiveTeam) {
    const { error } = await supabase
      .from("sport_roles")
      .delete()
      .in("user_id", userIds)
      .eq("sport", sport);

    if (error) return { error: error.message };
  } else {
    // Upsert each user's role (supabase doesn't support bulk upsert with .in())
    const rows = userIds.map((uid) => ({
      user_id: uid,
      sport,
      role: effectiveRole,
      is_team_member: effectiveTeam,
    }));

    const { error } = await supabase
      .from("sport_roles")
      .upsert(rows, { onConflict: "user_id,sport" });

    if (error) return { error: error.message };
  }

  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function bulkRemoveMembers(sport: string, userIds: string[]) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  if (userIds.length === 0) return { error: "No users selected" };

  // Prevent admin from removing themselves
  if (userIds.includes(result.user.id)) {
    return { error: "Cannot remove yourself" };
  }

  const { error } = await supabase
    .from("sport_roles")
    .delete()
    .in("user_id", userIds)
    .eq("sport", sport);

  if (error) return { error: error.message };

  // Also remove any pending access requests
  await supabase.from("team_access_requests").delete().in("user_id", userIds).eq("sport", sport);

  revalidatePath(`/${sport}/admin`);
  revalidatePath(`/${sport}`);
  return { success: true };
}

/** Search profiles for the "Add Member" dialog. */
export async function searchUsersAction(sport: string, query: string) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error, data: [] };

  if (!query || query.length < 2) return { data: [] };

  // Sanitize for PostgREST .or() filter:
  // 1. Escape LIKE wildcards so user input is treated literally
  // 2. Escape double quotes (PostgREST uses "" to escape within quoted values)
  // 3. Wrap in double quotes to prevent commas/dots from breaking filter parsing
  const escaped = query.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&").replace(/"/g, '""');

  // Fetch existing roles and search profiles in parallel
  const [{ data: existingRoles }, { data }] = await Promise.all([
    supabase.from("sport_roles").select("user_id").eq("sport", sport),
    supabase
      .from("profiles")
      .select("id, email, full_name, avatar_url")
      .or(`full_name.ilike."%${escaped}%",email.ilike."%${escaped}%"`)
      .limit(20),
  ]);
  const existingIds = new Set((existingRoles ?? []).map((r) => r.user_id));

  const results = (data ?? [])
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
      id: p.id,
      email: p.email as string | null,
      fullName: p.full_name as string | null,
      avatarUrl: p.avatar_url as string | null,
    }));

  return { data: results };
}
