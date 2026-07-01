/**
 * One-time cleanup: delete approved rows from team_access_requests.
 *
 * Since the new lifecycle deletes requests on approval (sport_role is authoritative),
 * any existing "approved" rows are stale and should be removed.
 *
 * Run with: npx tsx scripts/cleanup-approved-access-requests.ts
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_SECRET_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_SECRET_KEY env vars");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);

async function main() {
  const { data, error } = await supabase
    .from("team_access_requests")
    .delete()
    .eq("status", "approved")
    .select("id, user_id, sport");

  if (error) {
    console.error("Error deleting approved requests:", error.message);
    process.exit(1);
  }

  console.log(`Deleted ${data?.length ?? 0} approved access request(s)`);
  if (data && data.length > 0) {
    for (const row of data) {
      console.log(`  - user=${row.user_id}, sport=${row.sport}`);
    }
  }
}

main();
