"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import type { SessionType } from "@/lib/supabase/types";

const SPORT = "softball";

interface CreateSessionInput {
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

export async function createSession(input: CreateSessionInput) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, SPORT);
  if (!result.success) return { error: result.error };

  const { error } = await supabase.from("sessions").insert({
    ...input,
    sport: SPORT,
    created_by: result.user.id,
  });

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}`);
  revalidatePath(`/${SPORT}/admin`);
  return { success: true };
}

export async function updateSession(
  sessionId: string,
  input: Partial<CreateSessionInput>,
) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, SPORT);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .update(input)
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}`);
  revalidatePath(`/${SPORT}/session/${sessionId}`);
  revalidatePath(`/${SPORT}/admin`);
  return { success: true };
}

export async function deleteSession(sessionId: string) {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, SPORT);
  if (!result.success) return { error: result.error };

  const { error } = await supabase
    .from("sessions")
    .delete()
    .eq("id", sessionId);

  if (error) return { error: error.message };

  revalidatePath(`/${SPORT}`);
  revalidatePath(`/${SPORT}/admin`);
  return { success: true };
}
