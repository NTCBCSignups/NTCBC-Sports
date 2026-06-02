import type { Sport, FormResponseColumn } from "@/lib/schedule-utils";

// ── Enums ────────────────────────────────────────────────────────

/** Ordered user roles — higher numeric value = more privilege. */
export enum Role {
  anon = 0,
  user = 1,
  teamUser = 2,
  admin = 3,
}

/** Access level actions that can be gated per tab. */
export enum AccessLevel {
  overview = "overview",
  view = "view",
  signup = "signup",
  admin = "admin",
}

/** Session type pill colors. */
export enum PillColor {
  gray = "gray",
  emerald = "emerald",
  indigo = "indigo",
  amber = "amber",
  blue = "blue",
  rose = "rose",
  teal = "teal",
  violet = "violet",
}

// ── Types ────────────────────────────────────────────────────────

/** Maps each access level to the minimum Role required. */
export type TabPermissions = Record<AccessLevel, Role>;

/** Confirmation dialog shown before signup for users at or below a given role. */
export interface SignupConfirmationDialog {
  /** Show the dialog for users whose role is at or below this level. */
  maxRole: Role;
  /** Prompt message asking the user to confirm eligibility. */
  message: string;
  /** Message shown when the user answers "No". */
  rejectedMessage: string;
}

/** Default values applied to every tab during resolution. */
export interface TabDefaults {
  permissions: TabPermissions;
  sessionPillColor: PillColor;
}

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
  sessionPillColor?: PillColor;
  /** Optional confirmation dialog before signup for lower-role users. */
  signupConfirmationDialog?: SignupConfirmationDialog;
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
  defaultAdminTab?: string;
  authEnabled?: boolean;
  /** Extra sport-specific tabs to show in the admin sidebar. */
  adminTabs?: AdminTabMeta[];
}

// ── Resolved config interfaces (all defaults applied) ────────────

/** A session tab with all defaults fully resolved — no optionals for defaulted fields. */
export interface ResolvedSessionTab extends Omit<SessionTab, "permissions" | "sessionPillColor"> {
  permissions: TabPermissions;
  sessionPillColor: PillColor;
}

/** A sport config with all tab permissions resolved and computed flags. */
export interface ResolvedSportConfig extends Omit<SportConfig, "tabs"> {
  tabs: ResolvedSessionTab[];
  /** True if any tab requires a higher signup role than the default. */
  hasRestrictedAccess: boolean;
}

// ── Access banner text (data-driven) ─────────────────────────────

/** Text pair for access banners, with label interpolation. */
export interface AccessBannerText {
  title: (label: string) => string;
  message: (label: string) => string;
}

// ── DB-backed config interfaces (for source abstraction) ────────

/**
 * Explicit sport config fields stored as first-class DB columns.
 * These are global website-facing values shared across sport pages.
 */
export interface SportConfigCoreFields {
  id: string;
  authEnabled: boolean;
  emoji: string;
  name: string;
  type: string;
  description: string | null;
}

/**
 * Flexible DB payload for sport-specific and future-extensible settings.
 * Known keys are typed for safety; additional keys are allowed for expansion.
 */
export interface SportConfigPayload {
  day?: string;
  organizers?: string;
  location?: SportConfig["location"];
  waiverLink?: string;
  notes?: string[];
  responseTable?: ResponseTableConfig;
  multiSession?: boolean;
  tabs?: SessionTab[];
  defaultTab?: string;
  defaultAdminTab?: string;
  adminTabs?: AdminTabMeta[];
  [key: string]: unknown;
}

/**
 * Raw DB row shape for public.sport_configs.
 */
export interface SportConfigDbRow {
  id: string;
  auth_enabled: boolean;
  emoji: string;
  name: string;
  type: string;
  description: string | null;
  config: SportConfigPayload;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}

/** Source tag for config provider selection during migration period. */
export type SportConfigSource = "file" | "database";

/** Sport config with explicit source metadata for tracing and debugging. */
export interface SourcedSportConfig {
  source: SportConfigSource;
  config: ResolvedSportConfig;
}
