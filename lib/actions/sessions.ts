"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import type { SessionType } from "@/lib/supabase/types";

export interface CreateSessionInput {
  session_type: SessionType;
  title?: string;
  date: string;
  time_start: string;
  time_end: string;
  location_name: string;
  location_address: string;
  location_maps_link?: string;
  player_cap?: number | null;
  signup_open: string | null;
  signup_close: string | null;
  notes?: string;
}

export async function createSession(sport: string, input: CreateSessionInput) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const { error } = await supabase.from("sessions").insert({
    ...input,
    sport,
    created_by: result.user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/admin`);
  return { success: true };
}

export async function updateSession(
  sport: string,
  sessionId: string,
  input: Partial<CreateSessionInput>,
) {
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

export async function deleteSession(sport: string, sessionId: string) {
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
