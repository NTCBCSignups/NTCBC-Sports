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

import { api, ensureAuth } from "./ccsa-test-client";

// ── Profile access code parsing ──────────────────────────────────

const PAC_RE = /^P(\d{5})-([A-Z]{12})$/;

function parseProfileAccessCode(code: string): { playerId: number; playerPw: string } {
  const match = code.trim().toUpperCase().match(PAC_RE);
  if (!match) {
    throw new Error(
      `Invalid profile access code "${code}". Expected format: P00000-AAAAAAAAAAAA`,
    );
  }
  return { playerId: parseInt(match[1], 10), playerPw: match[2] };
}

// ── Team lookup ──────────────────────────────────────────────────

async function getTeamId(): Promise<number | null> {
  const userTeam = (await api("GET", "/team/userteam")) as Record<string, unknown>;
  const teamId = userTeam?.teamid ?? userTeam?.team_id ?? userTeam?.id;
  return teamId ? Number(teamId) : null;
}

// ── Main ─────────────────────────────────────────────────────────

async function run(email: string, profileAccessCode: string) {
  const { playerId, playerPw } = parseProfileAccessCode(profileAccessCode);

  await ensureAuth(email);

  const teamId = await getTeamId();
  if (!teamId) {
    console.error("Could not determine your team ID.");
    return;
  }

  console.log(`Adding player ${playerId} to team ${teamId}...`);
  const result = await api(
    "POST",
    `/team/${encodeURIComponent(teamId)}/addplayer`,
    { playerid: playerId, playerpw: playerPw, active: "player" },
  );
  console.log("Result:", JSON.stringify(result, null, 2));
}

// ── CLI ──────────────────────────────────────────────────────────

const args = process.argv.slice(2);

if (args.length >= 2) {
  run(args[0], args[1]).catch(console.error);
} else {
  console.log("Usage: npx tsx scripts/add-player-to-team.ts <email> <profile-access-code>");
}
