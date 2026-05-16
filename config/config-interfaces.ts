import type { Sport, FormResponseColumn } from "@/lib/schedule-utils";

// ── Enums ────────────────────────────────────────────────────────

/** Ordered user roles — higher numeric value = more privilege. */
export enum Role {
  anon = 0,
  user = 1,
  teamUser = 2,
  admin = 3,
}

/** Actions that can be gated per tab. */
export enum AccessLevel {
  view = "view",
  signup = "signup",
  admin = "admin",
}

// ── Types ────────────────────────────────────────────────────────

/** Maps each access level to the minimum Role required. */
export type TabPermissions = Record<AccessLevel, Role>;

export type SessionPillColor = "gray" | "emerald" | "indigo" | "amber";

// ── Raw config interfaces (authored in sports-config) ────────────

export interface ResponseTableEntry {
  time: string;
  playerCap: number;
  description?: string;
  filterColumn?: { header: string; value: string };
  hiddenColumns?: string[];
}

export interface ResponseTableConfig {
  sheetTab: string;
  columns: FormResponseColumn[];
  sessions: ResponseTableEntry[];
}

export interface SessionTab {
  value: string;
  label: string;
  /** Per-tab access control. Omitted keys fall back to defaults during resolution. */
  permissions?: Partial<TabPermissions>;
  /** Default prefix for session titles */
  defaultTitlePrefix?: string;
  /** Color token used for session type pills. */
  sessionPillColor?: SessionPillColor;
}

export interface AdminTabMeta {
  id: string;
  label: string;
  /** Lucide icon name (must be mapped in admin-sidebar) */
  iconName: string;
}

export interface SportConfig {
  id: Sport;
  emoji: string;
  name: string;
  type: string;
  location: {
    name: string;
    address: string;
    mapsLink?: string;
  };
  day: string;
  organizers: string;
  waiverLink?: string;
  notes: string[];
  responseTable?: ResponseTableConfig;
  multiSession?: boolean;
  description?: string;
  tabs?: SessionTab[];
  defaultTab?: string;
  authEnabled?: boolean;
  /** Extra sport-specific tabs to show in the admin sidebar. */
  adminTabs?: AdminTabMeta[];
}

// ── Resolved config interfaces (all defaults applied) ────────────

/** A session tab with all permissions fully resolved — no Partials. */
export interface ResolvedSessionTab extends Omit<SessionTab, "permissions"> {
  permissions: TabPermissions;
}

/** A sport config with all tab permissions resolved and computed flags. */
export interface ResolvedSportConfig extends Omit<SportConfig, "tabs"> {
  tabs: ResolvedSessionTab[];
  /** True if any tab requires a higher signup role than the default. */
  hasRestrictedAccess: boolean;
}
