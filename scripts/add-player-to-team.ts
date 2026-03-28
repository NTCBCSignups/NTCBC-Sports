/**
 * Add a player to a team using their profile access code.
 *
 * Usage:
 *   npx tsx scripts/add-player-to-team.ts <email> <profile-access-code>
 *
 * Profile access code format: P00000-AAAAAAAAAAAA
 *   - P + 5-digit zero-padded player ID + hyphen + 12 uppercase letters (password)
 *
 * On first run, it requests a login code and prompts for it.
 * On subsequent runs, it reuses the saved session cookie from /tmp.
 */

import { ensureAuth } from "./ccsa-test-client";
import { team } from "../lib/ccsa-api";

// ── Profile access code parsing ──────────────────────────────────

const PAC_RE = /^P(\d{5})-([A-Z]{12})$/;

function parseProfileAccessCode(code: string): { playerId: number; playerPw: string } {
    const match = code.trim().toUpperCase().match(PAC_RE);
    if (!match) {
        throw new Error(
            "Invalid profile access code. Expected format: P00000-AAAAAAAAAAAA",
        );
    }
    return { playerId: parseInt(match[1], 10), playerPw: match[2] };
}

// ── Main ─────────────────────────────────────────────────────────

async function run(email: string, profileAccessCode: string) {
    const { playerId, playerPw } = parseProfileAccessCode(profileAccessCode);

    await ensureAuth(email);

    const userTeam = await team.userTeam();
    const teamId = userTeam?.teamid;
    if (!teamId) {
        console.error("Could not determine your team ID.");
        return;
    }

    console.log(`Adding player ${playerId} to team ${teamId}...`);
    const result = await team.addPlayer(teamId, playerId, playerPw);
    console.log(`Added: ${result.firstname} ${result.lastname} (ID ${result.playerid})`);
}

// ── CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length >= 2) {
    run(args[0], args[1]).catch(console.error);
} else {
    console.log("Usage: npx tsx scripts/add-player-to-team.ts <email> <profile-access-code>");
}
