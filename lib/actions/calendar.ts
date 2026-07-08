"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/user";

/**
 * Tracks a calendar download event. Upserts into calendar_tracking
 * so we record the first download date and the most recent one.
 */
export async function trackCalendarDownload(sport: string): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("calendar_tracking").upsert(
    { user_id: user.id, sport, mode: "download" as const, last_used_at: new Date().toISOString() },
    { onConflict: "user_id,sport,mode", ignoreDuplicates: false },
  );
}
