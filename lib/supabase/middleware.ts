import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session — this is the critical call that keeps tokens alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Forward the authenticated user to server components via a request header
  // so pages never need to call getSession() / getUser() themselves.
  // Always set the header (empty when unauthenticated) to prevent client spoofing.
  request.headers.set(
    "x-supabase-user",
    user ? JSON.stringify(user) : "",
  );

  // Rebuild the response so it picks up the new request header,
  // then copy over any Set-Cookie headers from the token refresh.
  const setCookies = supabaseResponse.headers.getSetCookie();
  supabaseResponse = NextResponse.next({ request });
  setCookies.forEach((c) =>
    supabaseResponse.headers.append("Set-Cookie", c),
  );

  return supabaseResponse;
}
