import { AccessLevel, Role, type SessionTab } from "@/config/config-resolver";

// ── Access level ordering (for finding first unmet level) ────────
export const ACCESS_LEVELS: Exclude<AccessLevel, "admin">[] = [
  AccessLevel.overview,
  AccessLevel.view,
  AccessLevel.signup,
];

/**
 * Finds the first AccessLevel the user doesn't meet for a tab.
 * Returns null if the user meets all levels (or only lacks admin).
 */
export function getFirstUnmetLevel(
  tab: SessionTab,
  userRole: Role,
): Exclude<AccessLevel, "admin"> | null {
  for (const level of ACCESS_LEVELS) {
    if (userRole < tab.permissions[level]) return level;
  }
  return null;
}

/** Whether the user meets the view permission for this tab. */
export function canView(tab: SessionTab, userRole: Role): boolean {
  const unmet = getFirstUnmetLevel(tab, userRole);
  return unmet !== AccessLevel.overview && unmet !== AccessLevel.view;
}

/** Whether the user meets the signup permission for this tab. */
export function canSignup(tab: SessionTab, userRole: Role): boolean {
  return getFirstUnmetLevel(tab, userRole) === null;
}
