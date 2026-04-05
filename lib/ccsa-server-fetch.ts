/**
 * Ephemeral cookie-aware fetch for server-side CCSA API calls.
 * Cookies live only in memory for the duration of the request.
 */

import { setFetchImpl } from "./ccsa-api";

export function installEphemeralCookieFetch(): void {
  let cookies: string[] = [];

  const cookieFetch: typeof globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookies.length) headers.set("Cookie", cookies.join("; "));

    const response = await globalThis.fetch(input, {
      ...init,
      headers,
      redirect: "manual",
    });

    // Capture Set-Cookie headers
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
      const nameVal = sc.split(";")[0];
      const name = nameVal.split("=")[0];
      cookies = cookies.filter((c) => !c.startsWith(`${name}=`));
      cookies.push(nameVal);
    }

    return response;
  };

  setFetchImpl(cookieFetch);
}
