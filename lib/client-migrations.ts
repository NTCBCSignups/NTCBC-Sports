/**
 * Client-side localStorage migrations that run before React hydration.
 * Each entry has an expiry date — a test enforces removal after expiry.
 *
 * This is serialized into an inline <script> in layout.tsx — keep entries
 * synchronous, dependency-free, and as small as possible.
 */

export interface ClientMigration {
  id: string;
  expiresAt: string; // ISO date (YYYY-MM-DD)
  script: string;
}

export const CLIENT_MIGRATIONS: ClientMigration[] = [
  {
    id: "cherry-blossom-to-sakura",
    expiresAt: "2026-08-20",
    script: `if(localStorage.getItem("theme")==="cherry-blossom")localStorage.setItem("theme","sakura")`,
  },
];

export function getClientMigrationScript(): string {
  return CLIENT_MIGRATIONS.map((m) => m.script).join(";");
}
