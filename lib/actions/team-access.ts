"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getUser, requireSportAdmin } from "@/lib/supabase/user";

export async function requestTeamAccess(sport: string) {
  const supabase = await createClient();
  const user = await getUser();

  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase.from("team_access_requests").insert({
    user_id: user.id,
    sport,
  });

  if (error) {
    if (error.code === "23505") return { error: "Request already submitted" };
    return { error: error.message };
  }

  revalidatePath(`/${sport}`);
  return { success: true };
}

export async function reviewTeamAccessRequest(
  sport: string,
  requestId: string,
  status: "approved" | "rejected",
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data: request, error: fetchError } = await supabase
    .from("team_access_requests")
    .select("id, user_id, sport, status")
    .eq("id", requestId)
    .single();

  if (fetchError || !request) {
    return { error: fetchError?.message ?? "Request not found" };
  }

  const previousStatus = request.status;

  const { error } = await supabase
    .from("team_access_requests")
    .update({
      status,
      reviewed_by: result.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", requestId);

  if (error) return { error: error.message };

  if (status === "approved" && previousStatus !== "approved") {
    const { data: existingRole } = await supabase
      .from("sport_roles")
      .select("id")
      .eq("user_id", request.user_id)
      .eq("sport", request.sport)
      .maybeSingle();

    if (existingRole) {
      const { error: roleError } = await supabase
        .from("sport_roles")
        .update({ is_team_member: true })
        .eq("id", existingRole.id);
      if (roleError) return { error: roleError.message };
    } else {
      const { error: insError } = await supabase.from("sport_roles").insert({
        user_id: request.user_id,
        sport: request.sport,
        is_team_member: true,
      });
      if (insError) return { error: insError.message };
    }
  }

  if (status === "rejected" && previousStatus === "approved") {
    const { error: roleError } = await supabase
      .from("sport_roles")
      .update({ is_team_member: false })
      .eq("user_id", request.user_id)
      .eq("sport", request.sport);
    if (roleError) return { error: roleError.message };
  }

  revalidatePath(`/${sport}/admin`);
  revalidatePath(`/${sport}`);
  return { success: true };
}
