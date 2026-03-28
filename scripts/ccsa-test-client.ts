/**
 * Shared CCSA API helper for scripts.
 * Persists session cookies to /tmp/ccsa-cookies.json so sessions
 * survive across script runs.
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const API_BASE = "https://dashboard.ccsasoftball.net/api/v2";
const COOKIE_FILE = path.join("/tmp", "ccsa-cookies.json");

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

function saveCookies(cookies: string[]) {
    fs.writeFileSync(COOKIE_FILE, JSON.stringify(cookies), "utf-8");
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
// HTTP
// -----------

function buildUrl(endpoint: string, data?: Record<string, unknown>): string {
    let url = `${API_BASE}${endpoint}`;
    if (data) {
        const qs = new URLSearchParams(
            Object.fromEntries(
                Object.entries(data).map(([k, v]) => [k, String(v)])
            )
        ).toString();
        if (qs) url += `?${qs}`;
    }
    return url;
}

function buildHeaders(method: "GET" | "POST"): Record<string, string> {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (cookies.length) headers["Cookie"] = cookies.join("; ");
    if (method === "POST") headers["Content-Type"] = "application/json; charset=UTF-8";
    return headers;
}

async function parseResponse<T>(response: Response): Promise<T> {
    if (response.status === 204) return undefined as T;
    const text = await response.text();
    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
}

export async function api<T = unknown>(
    method: "GET" | "POST",
    endpoint: string,
    data?: Record<string, unknown>,
): Promise<T> {
    const isPost = method === "POST";
    const url = isPost ? `${API_BASE}${endpoint}` : buildUrl(endpoint, data);

    const response = await fetch(url, {
        method,
        headers: buildHeaders(method),
        redirect: "manual",
        body: isPost ? JSON.stringify(data ?? {}) : undefined,
    });

    captureCookies(response);

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`API ${response.status} ${response.statusText} on ${endpoint}: ${text}`);
    }

    return parseResponse<T>(response);
}

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

async function isSessionValid(): Promise<boolean> {
    if (!cookies.length) return false;
    try {
        const info = await api<Record<string, unknown>>("GET", "/auth/info");
        if (info?.playerid) {
            const { firstname, lastname } = info as { firstname: string; lastname: string };
            console.log(`Already authenticated as ${firstname} ${lastname}`);
            return true;
        }
    } catch {
        // Session expired or invalid
    }
    return false;
}

export async function ensureAuth(email: string): Promise<void> {
    if (await isSessionValid()) return;

    console.log(`Requesting login code for ${email}...`);
    await api("POST", "/auth/requestlogincode", { ident: email, dest: "email" });

    const otp = await prompt("Enter the login code from your email: ");
    if (!otp) {
        console.error("No code entered, aborting.");
        process.exit(1);
    }

    const result = await api("POST", "/auth/postlogin", { ident: email, otp });
    console.log("Logged in:", JSON.stringify(result, null, 2));
}

export function clearSession() {
    cookies = [];
    try { fs.unlinkSync(COOKIE_FILE); } catch { /* already gone */ }
    console.log("Session cleared.");
}
