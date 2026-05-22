"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import { SESSION_STATUS } from "@/lib/supabase/types";

export interface CreateSessionInput {
  session_type: string;
  title?: string;
  date: string;
  time_start: string;
  time_end: string;
  location_name: string;
  location_address: string;
  location_maps_link?: string;
  player_cap?: number | null;
  signup_open: string;
  signup_close: string;
  notes?: string;
}

export type CreateSessionResult =
  | { error: string }
  | { success: true; sessionId: string };

export type SessionActionResult =
  | { error: string }
  | { success: true };

export async function createSession(sport: string, input: CreateSessionInput): Promise<CreateSessionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data, error } = await supabase
    .from("sessions")
    .insert({
      ...input,
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
  input: Partial<CreateSessionInput>,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update(input)
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function deleteSession(sport: string, sessionId: string): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function cancelSession(sport: string, sessionId: string, reason?: string): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update({ status: SESSION_STATUS.cancelled, status_notes: reason || null })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function restoreSession(sport: string, sessionId: string): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update({ status: SESSION_STATUS.active, status_notes: null })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/session/${sessionId}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";
import { DEFAULT_VIEW_TYPE } from "@/components/sports/session-views/registry";

function slugify(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function createSessionView(
  sport: string,
  sessionId: string,
  type: string,
  label: string,
): Promise<{ error: string } | { success: true; viewId: string }> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("alt_session_views")
    .eq("id", sessionId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const current = (session?.alt_session_views as Record<string, StoredViewInstance>) ?? {};

  // When adding the first custom view to an empty session, auto-add the default
  // attendance view so it stays visible in the toggle alongside the new view.
  let updated = { ...current };
  if (Object.keys(current).length === 0 && type !== DEFAULT_VIEW_TYPE) {
    updated["attendance"] = { type: DEFAULT_VIEW_TYPE, label: "Attendance", data: null };
  }

  // Generate unique slug from label
  let slug = slugify(label);
  if (!slug) slug = "view";
  let viewId = slug;
  let counter = 2;
  while (viewId in updated) {
    viewId = `${slug}-${counter}`;
    counter++;
  }

  updated[viewId] = { type, label, data: null };

  const { error } = await supabase
    .from("sessions")
    .update({ alt_session_views: updated })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}/session/${sessionId}`);
  return { success: true, viewId };
}

export async function updateSessionViewData(
  sport: string,
  sessionId: string,
  viewId: string,
  data: unknown,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  // Fetch current view data to merge
  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("alt_session_views")
    .eq("id", sessionId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const current = (session?.alt_session_views as Record<string, StoredViewInstance>) ?? {};
  const existing = current[viewId];
  if (!existing) return { error: "View not found" };

  const updated = { ...current, [viewId]: { ...existing, data } };

  const { error } = await supabase
    .from("sessions")
    .update({ alt_session_views: updated })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}/session/${sessionId}`);
  return { success: true };
}

export async function deleteSessionView(
  sport: string,
  sessionId: string,
  viewId: string,
): Promise<SessionActionResult> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { data: session, error: fetchError } = await supabase
    .from("sessions")
    .select("alt_session_views")
    .eq("id", sessionId)
    .single();

  if (fetchError) return { error: fetchError.message };

  const current = (session?.alt_session_views as Record<string, StoredViewInstance>) ?? {};
  const { [viewId]: _, ...remaining } = current;

  const { error } = await supabase
    .from("sessions")
    .update({ alt_session_views: remaining })
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${sport}/session/${sessionId}`);
  return { success: true };
}
