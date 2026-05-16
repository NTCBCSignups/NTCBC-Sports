/**
 * Single entry point for all sport config consumers.
 * Import from here — never directly from sports-config or config-interfaces.
 * Use `resolvedSportsConfig[sport]` for fully resolved config with all defaults applied.
 */

import {
  AccessLevel,
  type SportConfig,
  type ResolvedSessionTab,
  type ResolvedSportConfig,
} from "./config-interfaces";
import { SPORT_DEFAULTS, sportsConfig } from "./sports-config";

// Re-export everything consumers need from a single entry point
export * from "./config-interfaces";

/**
 * Recursively merges `defaults` under `overrides`. Nested plain objects are
 * merged key-by-key so partial overrides (e.g. a tab that only sets
 * `{ signup: Role.teamUser }`) keep all other default keys intact.
 * Primitives and arrays in overrides replace defaults outright.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deepMerge(defaults: Record<string, any>, overrides: Record<string, any>): Record<string, any> {
  const result = { ...defaults };
  for (const key of Object.keys(overrides)) {
    const dVal = defaults[key];
    const oVal = overrides[key];
    if (dVal && oVal && typeof dVal === "object" && typeof oVal === "object" && !Array.isArray(dVal)) {
      result[key] = deepMerge(dVal, oVal);
    } else if (oVal !== undefined) {
      result[key] = oVal;
    }
  }
  return result;
}

// ── Resolution ──────────────────────────────────────────────────

/**
 * Builds a fully resolved sport config from a raw one.
 * Merges SPORT_DEFAULTS at the sport level, then merges tab-level defaults
 * into each tab, so configs only need to declare overrides.
 * Also computes derived flags like `hasRestrictedAccess`.
 */
export function resolveSportConfig(config: SportConfig): ResolvedSportConfig {
  // 1. Merge top-level sport defaults (authEnabled, etc.) under the raw config
  const merged = deepMerge(SPORT_DEFAULTS, config);

  // 2. Resolve each tab by merging tab defaults under it
  const tabs: ResolvedSessionTab[] = (config.tabs ?? []).map((t) =>
    deepMerge(SPORT_DEFAULTS.tab, t) as ResolvedSessionTab,
  );

  // 3. Compute derived flags
  return {
    ...merged,
    tabs,
    hasRestrictedAccess: tabs.some(
      (t) => t.permissions[AccessLevel.signup] > SPORT_DEFAULTS.tab.permissions[AccessLevel.signup],
    ),
  } as ResolvedSportConfig;
}

// ── Convenience helpers ─────────────────────────────────────────
// Thin wrappers over resolved data that save consumers from duplicating
// common lookups or fallback logic. No business rules live here — just
// ergonomic shortcuts so call sites stay concise.

/**
 * Finds the resolved tab matching a session type. Used by consumers that
 * have a session record and need its permissions/label/color without
 * searching `config.tabs` and duplicating the fallback to defaults
 * for unknown session types.
 */
export function getResolvedTab(config: ResolvedSportConfig, sessionType: string): ResolvedSessionTab {
  return config.tabs.find((t) => t.value === sessionType)
    ?? { value: sessionType, label: sessionType, ...SPORT_DEFAULTS.tab };
}

/** Pre-resolved configs keyed by sport slug. Consumers import this instead of raw sportsConfig. */
export const resolvedSportsConfig: Record<string, ResolvedSportConfig> = Object.fromEntries(
  Object.entries(sportsConfig).map(([key, config]) => [key, resolveSportConfig(config)]),
);
