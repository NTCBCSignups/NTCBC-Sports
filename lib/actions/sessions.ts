"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin, requireSessionAdminOrFacilitator } from "@/lib/supabase/user";
import { getSessionPath } from "@/lib/session-route";
import { SESSION_STATUS, type StoredViewInstance } from "@/lib/supabase/types";
import { parseSessionInput, type CreateSessionInput } from "@/lib/actions/session-validation";

export type { CreateSessionInput } from "@/lib/actions/session-validation";

export type CreateSessionResult = { error: string } | { success: true; sessionId: string };

export type SessionActionResult = { error: string } | { success: true };

export async function createSession(
  sport: string,
  input: CreateSessionInput,
): Promise<CreateSessionResult> {
  const parsed = parseSessionInput(input);
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      ...parsed.data,
      sport,
      created_by: result.user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true, sessionId: data.id };
}

export async function updateSession(
  sport: string,
  sessionId: string,
  input: CreateSessionInput,
): Promise<SessionActionResult> {
  const parsed = parseSessionInput(input);
  if (!parsed.success) return { error: parsed.error };

  const supabase = await createClient();
  const result = await requireSessionAdminOrFacilitator(supabase, sport, sessionId);
  if (!result.success) return { error: result.error };

  // Only admins can change facilitator_id
  const updateData = result.isAdmin ? parsed.data : { ...parsed.data, facilitator_id: undefined };

  const { error } = await supabase.from("sessions").update(updateData).eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function deleteSession(
  sport: string,
  sessionId: string,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase.from("sessions").delete().eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function cancelSession(
  sport: string,
  sessionId: string,
  reason?: string,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSessionAdminOrFacilitator(supabase, sport, sessionId);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update({ status: SESSION_STATUS.cancelled, status_notes: reason || null })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function restoreSession(
  sport: string,
  sessionId: string,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update({ status: SESSION_STATUS.active, status_notes: null })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(getSessionPath(sport, sessionId));
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function saveSessionViews(
  sport: string,
  sessionId: string,
  views: StoredViewInstance[],
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSessionAdminOrFacilitator(supabase, sport, sessionId);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update({ alt_session_views: views })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(getSessionPath(sport, sessionId));
  return { success: true };
}
