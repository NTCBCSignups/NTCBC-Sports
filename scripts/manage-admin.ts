/**
 * Add or remove a user from a sport's admin role.
 *
 * Usage:
 *   npx tsx scripts/manage-admin.ts
 *
 * Env vars (loaded from .env.local automatically):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SECRET_KEY
 */

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

import * as readline from "readline";
import { createClient } from "@supabase/supabase-js";

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

function prompt(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  const supabase = getSupabaseAdmin();
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  try {
    // Step 1: Choose action
    const action = await prompt(rl, "Action (add/remove): ");
    if (action !== "add" && action !== "remove") {
      console.error("Invalid action. Must be 'add' or 'remove'.");
      return;
    }

    // Step 2: Choose sport
    const sport = await prompt(rl, "Sport (e.g. softball, volleyball, basketball): ");
    if (!sport.trim()) {
      console.error("Sport is required.");
      return;
    }

    // Step 3: Search for user
    const search = await prompt(rl, "Search user by name or email: ");
    if (!search.trim()) {
      console.error("Search term is required.");
      return;
    }

    const { data: users, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .or(`full_name.ilike.%${search.trim()}%,email.ilike.%${search.trim()}%`)
      .limit(10);

    if (error) {
      console.error("Error searching users:", error.message);
      return;
    }

    if (!users || users.length === 0) {
      console.log("No users found.");
      return;
    }

    // Step 4: Display options
    console.log("\nMatching users:");
    users.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.full_name} (${user.email})`);
    });

    const choice = await prompt(rl, `\nSelect user (1-${users.length}): `);
    const index = parseInt(choice, 10) - 1;
    if (isNaN(index) || index < 0 || index >= users.length) {
      console.error("Invalid selection.");
      return;
    }

    const selectedUser = users[index]!;
    console.log(
      `\n${action === "add" ? "Adding" : "Removing"} admin: ${selectedUser.full_name} (${selectedUser.email}) for ${sport}`,
    );

    const confirm = await prompt(rl, "Confirm? (y/n): ");
    if (confirm.toLowerCase() !== "y") {
      console.log("Cancelled.");
      return;
    }

    // Step 5: Execute
    if (action === "add") {
      const { error: upsertError } = await supabase.from("sport_roles").upsert(
        {
          user_id: selectedUser.id,
          sport: sport.trim(),
          role: "admin",
          is_team_member: true,
        },
        { onConflict: "user_id,sport" },
      );

      if (upsertError) {
        console.error("Error adding admin:", upsertError.message);
      } else {
        console.log(`✓ ${selectedUser.full_name} is now an admin for ${sport}.`);
      }
    } else {
      const { error: updateError } = await supabase
        .from("sport_roles")
        .update({ role: "member" })
        .eq("user_id", selectedUser.id)
        .eq("sport", sport.trim())
        .eq("role", "admin");

      if (updateError) {
        console.error("Error removing admin:", updateError.message);
      } else {
        console.log(`✓ ${selectedUser.full_name} is no longer an admin for ${sport}.`);
      }
    }
  } finally {
    rl.close();
  }
}

main().catch(console.error);
