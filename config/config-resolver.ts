import {
  AccessLevel,
  Role,
  type SportConfig,
  type ResolvedSessionTab,
  type ResolvedSportConfig,
  type TabPermissions,
} from "./config-interfaces";
import { SPORT_DEFAULTS, sportsConfig } from "./sports-config";

// Re-export everything consumers need from a single entry point
export * from "./config-interfaces";

const defaults: TabPermissions = SPORT_DEFAULTS.tab.permissions;

// ── Resolution ──────────────────────────────────────────────────

/** Resolve a raw SportConfig into a ResolvedSportConfig with all defaults applied. */
export function resolveSportConfig(config: SportConfig): ResolvedSportConfig {
  const tabs: ResolvedSessionTab[] = (config.tabs ?? []).map((t) => ({
    ...t,
    permissions: { ...defaults, ...t.permissions },
  }));
  return {
    ...config,
    tabs,
    hasRestrictedAccess: tabs.some(
      (t) => t.permissions[AccessLevel.signup] > Role.user,
    ),
  };
}

/** Look up the resolved tab for a session type. Falls back to default permissions. */
export function getResolvedTab(config: ResolvedSportConfig, sessionType: string): ResolvedSessionTab {
  return config.tabs.find((t) => t.value === sessionType)
    ?? { value: sessionType, label: sessionType, permissions: defaults };
}

/** Pre-resolved configs with all tab defaults applied. */
export const resolvedSportsConfig: Record<string, ResolvedSportConfig> = Object.fromEntries(
  Object.entries(sportsConfig).map(([key, config]) => [key, resolveSportConfig(config)]),
);
