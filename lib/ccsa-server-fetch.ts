/**
 * Cookie-aware fetch for server-side CCSA API calls.
 * Accepts initial cookies (e.g. from a browser cookie) and
 * returns captured cookies after responses so they can be persisted.
 */

import { setFetchImpl } from "./ccsa-api";

let _capturedCookies: string[] = [];

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
