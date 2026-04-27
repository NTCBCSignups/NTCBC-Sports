/**
 * Fetch the full team roster via the CCSA API.
 *
 * Usage:
 *   npx tsx scripts/get-allplayerinfo.ts <email>
 *
 * On first run, it requests a login code and prompts for it.
 * On subsequent runs, it reuses the saved session cookie.
 */

import { ensureAuth } from "./ccsa-test-client";
import { team } from "../lib/softball/ccsa-api";

async function run(email: string) {
    await ensureAuth(email);

    // Get user's team
    console.log("\nFetching user team...");
    const userTeam = await team.userTeam();
    console.log("User team:", JSON.stringify(userTeam, null, 2));

    const teamId = userTeam?.teamid;
    if (!teamId) {
        console.error("Could not determine team ID from:", userTeam);
        return;
    }

    // Pull allPlayerInfo
    console.log(`\nFetching allPlayerInfo for team ${teamId}...`);
    const allPlayerInfo = await team.allPlayerInfo(teamId);
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
    console.log("Usage: npx tsx scripts/get-allplayerinfo.ts <email>");
}
