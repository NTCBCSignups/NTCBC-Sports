/**
 * Fetch the CCSA schedule for our team's games and upsert them
 * into the Supabase `sessions` table as scheduled_game entries.
 *
 * Usage:
 *   npx tsx scripts/get-schedule.ts <email>
 *
 * Env vars (loaded from .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 *
 * On first run, it requests a login code and prompts for it.
 * On subsequent runs, it reuses the saved session cookie.
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import { createClient } from "@supabase/supabase-js";
import { fromZonedTime } from "date-fns-tz";
import { ensureAuth } from "./ccsa-test-client";
import { sched, team } from "../lib/softball/ccsa-api";
import type { ScheduleGame } from "../lib/softball/ccsa-types";
import { SPORT_TIMEZONE } from "../lib/timezone";

const SPORT = "softball";
const GAME_DURATION_HOURS = 2;
const SIGNUP_OPEN_DAYS_BEFORE = 7;

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function formatGameTitle(game: ScheduleGame, gameNumber: number, teamId: number): string {
  const isHome = game.home === teamId;
  const opponent = isHome ? game.away_name : game.home_name;
  return `Game ${gameNumber}: ${isHome ? "Home" : "Away"} vs ${opponent}`;
}

/** Compute time_end by adding GAME_DURATION_HOURS to the start time. */
function computeEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number) as [number, number];
  const endHour = (h + GAME_DURATION_HOURS) % 24;
  return `${String(endHour).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Build a Google Maps search URL from a park name. */
function mapsLink(parkName: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(parkName)}`;
}

function printDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number) as [number, number, number];
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function printTime(time: string): string {
  const [h, m] = time.split(":") as [string, string];
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

async function run(email: string) {
  await ensureAuth(email);

  // Get user's team to determine team ID
  console.log("\nFetching user team...");
  const userTeam = await team.userTeam();
  const teamId = userTeam?.teamid;
  const teamName = userTeam?.name;
  if (!teamId) {
    console.error("Could not determine team ID.");
    return;
  }
  console.log(`Team: ${teamName} (ID: ${teamId})`);

  // Fetch full schedule
  console.log("\nFetching CCSA schedule...");
  const { schedule, lastupdate } = await sched.getSchedule();
  console.log(`Schedule last updated: ${lastupdate}`);
  console.log(`Total games in schedule: ${schedule.length}`);

  // Filter games where our team is home or away
  const ourGames = schedule.filter((g) => g.home === teamId || g.away === teamId);

  // Sort by date then time
  ourGames.sort((a, b) => {
    const dateComp = a.date.localeCompare(b.date);
    if (dateComp !== 0) return dateComp;
    return a.time.localeCompare(b.time);
  });

  console.log(`\n${"=".repeat(60)}`);
  console.log(`${teamName} — ${ourGames.length} scheduled games`);
  console.log(`${"=".repeat(60)}\n`);

  if (ourGames.length === 0) {
    console.log("No games found for this team.");
    return;
  }

  for (let i = 0; i < ourGames.length; i++) {
    const game = ourGames[i]!;
    const title = formatGameTitle(game, i + 1, teamId);
    console.log(`${title}`);
    console.log(`  Date:     ${printDate(game.date)}`);
    console.log(`  Time:     ${printTime(game.time)}`);
    console.log(`  Park:     ${game.park_name}`);
    console.log(`  Code:     ${game.gamecode}`);
    if (game.umps_name) {
      console.log(`  Umps:     ${game.umps_name}`);
    }
    console.log();
  }

  // ── Upsert into Supabase ────────────────────────────────────
  const supabase = getSupabaseAdmin();

  // Fetch existing scheduled_game sessions for softball to match by gamecode in notes
  const { data: existing } = await supabase
    .from("sessions")
    .select("id, notes")
    .eq("sport", SPORT)
    .eq("session_type", "scheduled_game");

  const existingByGamecode = new Map<string, string>();
  for (const s of existing ?? []) {
    const match = s.notes?.match(/Game Code:\s*(\S+)/);
    if (match) existingByGamecode.set(match[1], s.id);
  }

  const rows = ourGames.map((game, i) => {
    const title = formatGameTitle(game, i + 1, teamId);
    const timeEnd = computeEndTime(game.time);

    // signup_open = now (immediately available)
    const signupOpen = new Date();

    // signup_close = game start time
    // game.time may be "HH:MM" or "HH:MM:SS" — normalize to HH:MM:SS
    const timeForParse = game.time.length <= 5 ? `${game.time}:00` : game.time;
    const signupClose = fromZonedTime(`${game.date}T${timeForParse}`, SPORT_TIMEZONE);

    const isHome = game.home === teamId;
    const opponent = isHome ? game.away_name : game.home_name;
    const noteParts = [`Game Code: ${game.gamecode}`, `${isHome ? "Home" : "Away"} vs ${opponent}`];
    if (game.umps_name) noteParts.push(`Umps: Team ${game.umps_name}`);
    const notes = noteParts.join("\n");

    const base = {
      sport: SPORT,
      session_type: "scheduled_game" as const,
      title,
      date: game.date,
      time_start: game.time,
      time_end: timeEnd,
      location_name: game.park_name,
      location_address: game.park_name,
      location_maps_link: mapsLink(game.park_name),
      player_cap: null,
      signup_open: signupOpen.toISOString(),
      signup_close: signupClose.toISOString(),
      notes,
    };

    const existingId = existingByGamecode.get(game.gamecode);
    return existingId ? { id: existingId, ...base } : base;
  });

  console.log(`Upserting ${rows.length} games into sessions table...`);

  const { data: upserted, error } = await supabase
    .from("sessions")
    .upsert(rows, { onConflict: "id" })
    .select("id, title");

  if (error) {
    console.error("Upsert failed:", error.message);
    return;
  }

  console.log(`Successfully upserted ${upserted?.length ?? 0} games:`);
  for (const s of upserted ?? []) {
    console.log(`  ✓ ${s.title}`);
  }
}

// CLI
const args = process.argv.slice(2);

if (args.length >= 1) {
  run(args[0]!).catch(console.error);
} else {
  console.log("Usage: npx tsx scripts/sync-ccsa-games.ts <email>");
}
