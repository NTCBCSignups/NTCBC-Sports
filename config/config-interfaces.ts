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
