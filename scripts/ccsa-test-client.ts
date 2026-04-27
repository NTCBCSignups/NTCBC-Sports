/**
 * Shared CCSA API helper for scripts.
 * Injects a cookie-aware fetch into ccsa-api so all typed API
 * methods work from Node.js with persistent sessions.
 */

import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import * as readline from "readline";

import { setFetchImpl, auth } from "../lib/softball/ccsa-api";

const COOKIE_FILE = path.join(os.tmpdir(), "ccsa-cookies.json");

// -----------
// Cookie I/O
// -----------

function loadCookies(): string[] {
    try {
        const raw = fs.readFileSync(COOKIE_FILE, "utf-8");
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
    } catch {
        // Missing or invalid file — start fresh
    }
    return [];
}

function saveCookies(jar: string[]) {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(jar), { encoding: "utf-8", mode: 0o600 });
}

function captureCookies(response: Response) {
    const setCookies = response.headers.getSetCookie?.() ?? [];
    for (const sc of setCookies) {
        const nameVal = sc.split(";")[0];
        const name = nameVal.split("=")[0];
        cookies = cookies.filter((c) => !c.startsWith(`${name}=`));
        cookies.push(nameVal);
    }
    saveCookies(cookies);
}

let cookies: string[] = loadCookies();

// -----------
// Cookie-aware fetch & registration
// -----------

const cookieFetch: typeof globalThis.fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    if (cookies.length) headers.set("Cookie", cookies.join("; "));

    const response = await globalThis.fetch(input, {
        ...init,
        headers,
        redirect: "manual",
    });

    captureCookies(response);
    return response;
};

setFetchImpl(cookieFetch);

// -----------
// CLI helpers
// -----------

export function prompt(question: string): Promise<string> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// -----------
// Auth
// -----------

export async function ensureAuth(email: string): Promise<void> {
    const result = await auth.ensureAuth(email, () =>
        prompt("Enter the login code from your email: ")
    );
    console.log(`Authenticated as ${result.firstname} ${result.lastname}`);
}

export function clearSession() {
    cookies = [];
    try { fs.unlinkSync(COOKIE_FILE); } catch { /* already gone */ }
    console.log("Session cleared.");
}
