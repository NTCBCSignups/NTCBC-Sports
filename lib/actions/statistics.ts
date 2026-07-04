"use server";

import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import { getPlayerStatistics, type PlayerStatistics } from "@/lib/get-statistics";

export async function fetchPlayerStats(
  sport: string,
  userId: string,
): Promise<{ data?: PlayerStatistics; error?: string }> {
  const supabase = await createClient();
  const result = await requireSportAdmin(supabase, sport);
  if (!result.success) return { error: result.error };

  const data = await getPlayerStatistics(sport, userId);
  return { data };
}
