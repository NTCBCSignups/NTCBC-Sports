/**
 * Single entry point for all sport config consumers.
 * Import from here — never directly from sports-config or config-interfaces.
 */

import {
  AccessLevel,
  Role,
  type SessionTab,
  type SportConfig,
  type SportConfigDbRow,
  type ResolvedSportConfig,
} from "./config-interfaces";

// Re-export everything consumers need from a single entry point
export * from "./config-interfaces";

// ── Resolution ──────────────────────────────────────────────────

/**
 * Builds a fully resolved sport config from a raw one.
 * Runtime config comes from the settings payload; no field-level defaults
 * are injected here.
 */
export function resolveSportConfig(config: SportConfig): ResolvedSportConfig {
  const tabs = config.tabs ?? [];

  return {
    ...config,
    tabs,
    hasRestrictedAccess: tabs.some((t) => t.permissions[AccessLevel.signup] > Role.user),
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === "string");
}

function isLocation(value: SportConfig["location"] | undefined): value is SportConfig["location"] {
  return (
    !!value &&
    isNonEmptyString(value.name) &&
    isNonEmptyString(value.address) &&
    (value.mapsLink === undefined || typeof value.mapsLink === "string")
  );
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
    id: row.id,
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
    defaultAdminTab: payload.defaultAdminTab,
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
export function getResolvedTab(config: ResolvedSportConfig, sessionType: string): SessionTab {
  const matchingTab = config.tabs.find((t) => t.value === sessionType);
  if (matchingTab) return matchingTab;

  const fallbackTab = config.tabs[0];
  if (!fallbackTab) {
    throw new Error(`Sport config \"${config.id}\" has no configured session tabs.`);
  }

  return {
    ...fallbackTab,
    value: sessionType,
    label: sessionType,
  };
}
