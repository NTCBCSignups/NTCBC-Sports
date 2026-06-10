/**
 * Validated Supabase environment variables.
 * Uses direct property access so Next.js can inline NEXT_PUBLIC_ vars for the browser bundle.
 * Fails fast with a clear message instead of cryptic errors downstream.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
    throw new Error(
        "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Ensure they are set in .env.local or your deployment environment.",
    );
}

export const SUPABASE_URL: string = url;
export const SUPABASE_PUBLISHABLE_KEY: string = key;
