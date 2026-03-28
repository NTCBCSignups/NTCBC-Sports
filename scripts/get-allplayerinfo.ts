/**
 * Test script to login to CCSA API and pull allPlayerInfo.
 *
 * Usage:
 *   npx tsx scripts/test-allplayerinfo.ts <email>
 *
 * On first run, it requests a login code and prompts for it.
 * On subsequent runs, it reuses the saved session cookie from /tmp.
 */

import { api, ensureAuth } from "./ccsa-test-client";

async function run(email: string) {
    await ensureAuth(email);

    // Get user's team
    console.log("\nFetching user team...");
    const userTeam = (await api("GET", "/team/userteam")) as Record<string, unknown>;
    console.log("User team:", JSON.stringify(userTeam, null, 2));

    // Extract team ID
    const teamId =
        userTeam?.teamid ?? userTeam?.team_id ?? userTeam?.id;
    if (!teamId) {
        console.error("Could not determine team ID from:", userTeam);
        return;
    }

    // Pull allPlayerInfo
    console.log(`\nFetching allPlayerInfo for team ${teamId}...`);
    const allPlayerInfo = await api(
        "GET",
        `/team/${encodeURIComponent(String(teamId))}/allplayerinfo`
    );
    console.log(
        "allPlayerInfo:",
        JSON.stringify(allPlayerInfo, null, 2)
    );
}

// CLI
const args = process.argv.slice(2);

if (args.length >= 1) {
    run(args[0]).catch(console.error);
} else {
    console.log("Usage: npx tsx scripts/test-allplayerinfo.ts <email>");
}
