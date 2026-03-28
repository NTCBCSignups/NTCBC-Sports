import { createClient } from "@supabase/supabase-js";

/**
 * Server-only client that bypasses RLS. Used when a normal user session cannot
 * perform the operation (e.g. promoting another user’s signup off the waitlist).
 * Requires `SUPABASE_SERVICE_ROLE_KEY` in the environment (never expose to the client).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for admin operations",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
