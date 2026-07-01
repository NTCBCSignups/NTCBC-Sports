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

  const updatePayload: Record<string, unknown> = {};
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.isTeamMember !== undefined) updatePayload.is_team_member = updates.isTeamMember;

  if (Object.keys(updatePayload).length === 0) {
    return { error: "No updates provided" };
  }

  const { error } = await supabase
    .from("sport_roles")
    .update(updatePayload)
    .eq("user_id", userId)
    .eq("sport", sport);

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

  const { error } = await supabase.from("sport_roles").insert({
    user_id: userId,
    sport,
    role: options.role ?? "member",
    is_team_member: options.isTeamMember ?? false,
  });

  if (error) {
    if (error.code === "23505") return { error: "User is already a member of this sport" };
    return { error: error.message };
  }

  // Clean up any pending access request for this user
  await supabase
    .from("team_access_requests")
    .delete()
    .eq("user_id", userId)
    .eq("sport", sport);

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
  await supabase
    .from("team_access_requests")
    .delete()
    .eq("user_id", userId)
    .eq("sport", sport);

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

  const updatePayload: Record<string, unknown> = {};
  if (updates.role !== undefined) updatePayload.role = updates.role;
  if (updates.isTeamMember !== undefined) updatePayload.is_team_member = updates.isTeamMember;

  if (Object.keys(updatePayload).length === 0) {
    return { error: "No updates provided" };
  }

  const { error } = await supabase
    .from("sport_roles")
    .update(updatePayload)
    .in("user_id", userIds)
    .eq("sport", sport);

  if (error) return { error: error.message };

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
  await supabase
    .from("team_access_requests")
    .delete()
    .in("user_id", userIds)
    .eq("sport", sport);

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

  // Get existing sport_role user IDs to exclude
  const { data: existingRoles } = await supabase
    .from("sport_roles")
    .select("user_id")
    .eq("sport", sport);
  const existingIds = new Set((existingRoles ?? []).map((r) => r.user_id));

  // Search profiles by name or email (parameterized via ilike)
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url")
    .or(`full_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(20);

  const results = (data ?? [])
    .filter((p) => !existingIds.has(p.id))
    .map((p) => ({
      id: p.id,
      email: p.email as string,
      fullName: p.full_name as string | null,
      avatarUrl: p.avatar_url as string | null,
    }));

  return { data: results };
}
