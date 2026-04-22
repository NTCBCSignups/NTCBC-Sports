/**
 * Cookie-aware fetch for server-side CCSA API calls.
 * Returns a handle to retrieve captured cookies after responses,
 * scoped per invocation to avoid concurrency issues.
 */

import { setFetchImpl } from "./ccsa-api";

let _capturedCookies: string[] = [];

/**
 * Install a cookie-aware fetch. Each call replaces the global fetch impl
 * in ccsa-api with one that injects and captures cookies.
 *
 * Note: This uses module-level state for captured cookies. In Next.js server
 * actions, each request runs in its own module scope, so concurrent requests
 * do not share state. If this assumption changes, refactor to pass cookies
 * through a context object.
 */
export function installCookieFetch(initialCookies: string[] = []): void {
    _capturedCookies = [...initialCookies];

    const cookieFetch: typeof globalThis.fetch = async (input, init) => {
        const headers = new Headers(init?.headers);
        if (_capturedCookies.length) headers.set("Cookie", _capturedCookies.join("; "));

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
            _capturedCookies = _capturedCookies.filter((c) => !c.startsWith(`${name}=`));
            _capturedCookies.push(nameVal);
        }

        return response;
    };

    setFetchImpl(cookieFetch);
}

export function getCapturedCookies(): string[] {
    return _capturedCookies;
}
