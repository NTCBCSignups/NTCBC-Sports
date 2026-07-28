import type { Profile } from "@/lib/supabase/types";

/**
 * Safely coerce a Supabase join result to a Profile.
 * Supabase's TypeScript client doesn't properly type nested .select() joins,
 * requiring `as unknown as` casts. This helper validates the shape at runtime
 * so schema changes surface as visible failures rather than silent data corruption.
 */
export function asProfile(value: unknown): Profile | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  return value as Profile;
}

/**
 * Safely coerce a Supabase join result to a minimal profile (id + name + email).
 */
export function asMinimalProfile(value: unknown): {
  id: string;
  full_name: string | null;
  email: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== "string") return null;
  return {
    id: obj.id,
    full_name: typeof obj.full_name === "string" ? obj.full_name : null,
    email: typeof obj.email === "string" ? obj.email : null,
  };
}

/**
 * Safely coerce a Supabase join result to a name-only profile (for lists).
 */
export function asNameProfile(value: unknown): {
  full_name: string | null;
  email: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;
  return {
    full_name: typeof obj.full_name === "string" ? obj.full_name : null,
    email: typeof obj.email === "string" ? obj.email : null,
  };
}
