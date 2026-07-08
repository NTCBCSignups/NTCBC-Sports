"use server";

import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/supabase/user";

/**
 * Tracks a calendar download event. Upserts into calendar_tracking
 * so we record the first download date (created_at, via DB default) and
 * the most recent one (last_used_at). PK is (user_id, sport, mode) so a
 * user can have both a subscribe and download row independently.
 */
export async function trackCalendarDownload(sport: string): Promise<void> {
  const user = await getUser();
  if (!user) return;

  const supabase = await createClient();
  await supabase.from("calendar_tracking").upsert(
    {
      user_id: user.id,
      sport,
      mode: "download" as const,
      last_used_at: new Date().toISOString(),
    },
    { onConflict: "user_id,sport,mode", ignoreDuplicates: false },
  );
}
