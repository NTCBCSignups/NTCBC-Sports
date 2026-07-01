import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  // Validate the JWT and refresh the session.
  // getClaims() verifies the token signature locally via WebCrypto (no network call
  // to the Auth server) and triggers a refresh if the token is expired.
  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims ?? null;

  // Forward only the fields actually consumed downstream (id, email, user_metadata)
  // to keep the header small. Always set (empty when unauthenticated) to prevent spoofing.
  request.headers.set(
    "x-supabase-user",
    claims
      ? JSON.stringify({
          id: claims.sub,
          email: claims.email,
          user_metadata: {
            full_name: (claims.user_metadata as Record<string, unknown>)?.full_name,
            avatar_url: (claims.user_metadata as Record<string, unknown>)?.avatar_url,
          },
        })
      : "",
  );

  // Rebuild the response so it picks up the new request header,
  // then copy over any Set-Cookie headers from the token refresh.
  const setCookies = supabaseResponse.headers.getSetCookie();
  supabaseResponse = NextResponse.next({ request });
  setCookies.forEach((c) => supabaseResponse.headers.append("Set-Cookie", c));

  return supabaseResponse;
}
