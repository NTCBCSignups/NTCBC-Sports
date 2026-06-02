/**
 * Single entry point for all sport config consumers.
 * Import from here — never directly from sports-config or config-interfaces.
 * Use `resolvedSportsConfig[sport]` for fully resolved config with all defaults applied.
 */

import {
  AccessLevel,
  type SportConfig,
  type SportConfigDbRow,
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

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isLocation(value: SportConfig["location"] | undefined): value is SportConfig["location"] {
  return !!value
    && isNonEmptyString(value.name)
    && isNonEmptyString(value.address)
    && (value.mapsLink === undefined || typeof value.mapsLink === "string");
}

/**
 * Converts a DB row into the raw SportConfig shape expected by resolveSportConfig.
 * Returns null when required shared fields are missing.
 */
export function sportConfigFromDbRow(row: SportConfigDbRow): SportConfig | null {
  const payload = row.config;

  if (!isNonEmptyString(payload.day)) return null;
  if (!isNonEmptyString(payload.organizers)) return null;
  if (!isStringArray(payload.notes)) return null;
  if (!isLocation(payload.location)) return null;

  return {
    id: row.id as SportConfig["id"],
    authEnabled: row.auth_enabled,
    emoji: row.emoji,
    name: row.name,
    type: row.type,
    description: row.description ?? undefined,
    day: payload.day,
    organizers: payload.organizers,
    location: payload.location,
    waiverLink: payload.waiverLink,
    notes: payload.notes,
    responseTable: payload.responseTable,
    multiSession: payload.multiSession,
    tabs: payload.tabs,
    defaultTab: payload.defaultTab,
    adminTabs: payload.adminTabs,
  };
}

/** Resolves a DB row directly to a fully merged sport config. */
export function resolveSportConfigRow(row: SportConfigDbRow): ResolvedSportConfig | null {
  const config = sportConfigFromDbRow(row);
  return config ? resolveSportConfig(config) : null;
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
