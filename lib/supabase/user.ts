import { headers } from "next/headers";
import type { User } from "@supabase/supabase-js";

/**
 * Reads the authenticated user forwarded by middleware via the
 * `x-supabase-user` request header.  No network call — instant.
 */
export async function getUser(): Promise<User | null> {
    const h = await headers();
    const raw = h.get("x-supabase-user");
    if (!raw) return null;
    try {
        return JSON.parse(raw) as User;
    } catch {
        return null;
    }
}
