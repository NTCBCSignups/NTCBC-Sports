"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireSportAdmin } from "@/lib/supabase/user";
import { installCookieFetch, getCapturedCookies } from "@/lib/ccsa-server-fetch";
import { auth, team } from "@/lib/ccsa-api";
import type { WaiverStatus } from "@/lib/supabase/types";

const SPORT = "softball";
const CCSA_COOKIE_NAME = "ccsa_session";
const CCSA_EMAIL_COOKIE = "ccsa_email";

async function ensureSportAdmin() {
    const supabase = await createClient();
    const result = await requireSportAdmin(supabase, SPORT);
    if (!result.success) throw new Error(result.error);
    return result.user;
}

function mapWaiverStatus(needwaiver: false | "paper" | "online"): WaiverStatus {
    if (needwaiver === false) return "valid";
    if (needwaiver === "paper") return "needs_paper";
    return "needs_online";
}

async function loadCcsaCookies(): Promise<string[]> {
    const cookieStore = await cookies();
    const stored = cookieStore.get(CCSA_COOKIE_NAME)?.value;
    if (!stored) return [];
    try {
        const parsed = JSON.parse(stored);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

async function saveCcsaCookies(ccsaCookies: string[]): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(CCSA_COOKIE_NAME, JSON.stringify(ccsaCookies), {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

async function clearCcsaCookies(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(CCSA_COOKIE_NAME);
    cookieStore.delete(CCSA_EMAIL_COOKIE);
}

async function saveCcsaEmail(email: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(CCSA_EMAIL_COOKIE, email, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7,
        path: "/",
    });
}

async function loadCcsaEmail(): Promise<string | null> {
    const cookieStore = await cookies();
    return cookieStore.get(CCSA_EMAIL_COOKIE)?.value ?? null;
}

export async function requestCcsaLogin(email: string) {
    await ensureSportAdmin();

    installCookieFetch();
    try {
        await auth.requestLoginCode(email, "email");
        await saveCcsaCookies(getCapturedCookies());
        return { success: true };
    } catch (e) {
        return { error: e instanceof Error ? e.message : "Failed to send login code" };
    }
}

export async function completeCcsaLogin(email: string, otp: string) {
    await ensureSportAdmin();

    const existing = await loadCcsaCookies();
    installCookieFetch(existing);
    try {
        await auth.postLogin(email, otp);
        await saveCcsaCookies(getCapturedCookies());
        await saveCcsaEmail(email);
        return { success: true };
    } catch (e) {
        await clearCcsaCookies();
        return { error: e instanceof Error ? e.message : "Login failed" };
    }
}

export async function hasCcsaSession() {
    await ensureSportAdmin();
    const stored = await loadCcsaCookies();
    const email = await loadCcsaEmail();
    return { hasCookies: stored.length > 0, email };
}

export async function logoutCcsa() {
    await ensureSportAdmin();
    await clearCcsaCookies();
    return { success: true };
}

export async function syncCcsaWaivers() {
    await ensureSportAdmin();

    const existing = await loadCcsaCookies();
    if (existing.length === 0) {
        return { error: "No CCSA session. Please log in first." };
    }

    installCookieFetch(existing);
    try {
        const userTeam = await team.userTeam();
        const teamId = userTeam?.teamid;
        if (!teamId) {
            return { error: "Could not determine CCSA team ID" };
        }

        const players = await team.allPlayerInfo(teamId);
        if (!players || players.length === 0) {
            return { error: "No players found on CCSA team" };
        }

        // Save any refreshed cookies
        await saveCcsaCookies(getCapturedCookies());

        const admin = createAdminClient();
        const now = new Date().toISOString();

        const rows = players.map((p) => ({
            email: p.email.toLowerCase(),
            ccsa_player_id: p.playerid,
            first_name: p.firstname,
            last_name: p.lastname,
            waiver_status: mapWaiverStatus(p.needwaiver),
            synced_at: now,
        }));

        const playerSummary = rows.map(({ email, first_name, last_name, waiver_status }) => ({
            email, first_name, last_name, waiver_status,
        }));

        const { error: upsertError } = await admin
            .from("ccsa_players")
            .upsert(rows, { onConflict: "email" });

        if (upsertError) {
            return { error: `DB sync failed: ${upsertError.message}`, players: playerSummary, count: players.length };
        }

        revalidatePath(`/${SPORT}/admin`);
        revalidatePath(`/${SPORT}`);
        return { success: true, count: players.length, players: playerSummary };
    } catch (e) {
        // Session likely expired
        await clearCcsaCookies();
        return { error: e instanceof Error ? e.message : "Sync failed — CCSA session may have expired" };
    }
}

export async function approveCcsaPlayersForTeam() {
    const user = await ensureSportAdmin();

    const admin = createAdminClient();

    const { data: ccsaPlayers, error: fetchError } = await admin
        .from("ccsa_players")
        .select("email");

    if (fetchError || !ccsaPlayers) {
        return { error: fetchError?.message ?? "No CCSA players found" };
    }

    const emails = ccsaPlayers.map((p) => p.email);

    // Find matching profiles
    const { data: profiles, error: profileError } = await admin
        .from("profiles")
        .select("id, email")
        .in("email", emails);

    if (profileError || !profiles) {
        return { error: profileError?.message ?? "Could not look up profiles" };
    }

    const userIds = profiles.map((p) => p.id);

    // Batch upsert sport_roles
    const { error: rolesError } = await admin
        .from("sport_roles")
        .upsert(
            profiles.map((p) => ({
                user_id: p.id,
                sport: SPORT,
                is_team_member: true,
            })),
            { onConflict: "user_id,sport" },
        );

    if (rolesError) return { error: `Failed to update roles: ${rolesError.message}` };

    // Batch approve pending team_access_requests
    await admin
        .from("team_access_requests")
        .update({
            status: "approved",
            reviewed_by: user.id,
            reviewed_at: new Date().toISOString(),
        })
        .in("user_id", userIds)
        .eq("sport", SPORT)
        .eq("status", "pending");

    revalidatePath(`/${SPORT}/admin`);
    revalidatePath(`/${SPORT}`);
    return { success: true, count: profiles.length };
}

export async function deleteAllCcsaPlayers() {
    await ensureSportAdmin();

    const admin = createAdminClient();
    // Supabase requires a filter on delete; use an always-true condition to delete all rows
    const { error } = await admin.from("ccsa_players").delete().gte("created_at", "1970-01-01");

    if (error) return { error: error.message };

    revalidatePath(`/${SPORT}/admin`);
    revalidatePath(`/${SPORT}`);
    return { success: true };
}
