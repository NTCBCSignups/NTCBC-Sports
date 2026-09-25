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
    // Sakura became a palette (paired light/dark) instead of a standalone theme.
    id: "sakura-theme-to-palette",
    expiresAt: "2027-03-17",
    script: `if(localStorage.getItem("theme")==="sakura"){localStorage.setItem("theme","system");localStorage.setItem("palette","sakura")}`,
  },
];

export function getClientMigrationScript(): string {
  return CLIENT_MIGRATIONS.map((m) => m.script).join(";");
}
