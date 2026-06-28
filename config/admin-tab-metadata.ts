import type { AdminTabMeta, SessionTab, SportConfigPayload } from "./config-interfaces";
import { AccessLevel, PillColor, Role } from "./config-interfaces";

export const ADMIN_TAB_ICON_NAMES = [
  "ClipboardList",
  "Plus",
  "Calendar",
  "History",
  "RefreshCw",
  "SlidersHorizontal",
] as const;

export type AdminTabIconName = (typeof ADMIN_TAB_ICON_NAMES)[number];

const adminTabIconNameSet = new Set<string>(ADMIN_TAB_ICON_NAMES);

export function isAdminTabIconName(value: string): value is AdminTabIconName {
  return adminTabIconNameSet.has(value);
}

export const SETTINGS_TAB_ID = "settings";
export const SETTINGS_TAB_LABEL = "Settings";
export const SETTINGS_TAB_ICON_NAME: AdminTabIconName = "SlidersHorizontal";

export const SETTINGS_ADMIN_TAB: AdminTabMeta = {
  id: SETTINGS_TAB_ID,
  label: SETTINGS_TAB_LABEL,
  iconName: SETTINGS_TAB_ICON_NAME,
};

export const DEFAULT_ADMIN_TABS: AdminTabMeta[] = [
  {
    id: "requests",
    label: "Access Requests",
    iconName: "ClipboardList",
  },
  {
    id: "create",
    label: "Create Session",
    iconName: "Plus",
  },
  {
    id: "upcoming",
    label: "Upcoming Sessions",
    iconName: "Calendar",
  },
  {
    id: "past",
    label: "Past Sessions",
    iconName: "History",
  },
];

// ── Default session tab for newly created sports ─────────────────

export const DEFAULT_SESSION_TAB: SessionTab = {
  id: "tab-default",
  value: "regular",
  label: "Regular",
  sessionPillColor: PillColor.emerald,
  permissions: {
    [AccessLevel.overview]: Role.anon,
    [AccessLevel.view]: Role.anon,
    [AccessLevel.signup]: Role.user,
    [AccessLevel.admin]: Role.admin,
  },
};

// ── Default config payload for newly created sports ──────────────

export function buildDefaultSportConfigPayload(fields: {
  day: string;
  organizers: string;
  locationName: string;
  locationAddress: string;
}): SportConfigPayload {
  return {
    day: fields.day,
    organizers: fields.organizers,
    location: {
      name: fields.locationName,
      address: fields.locationAddress,
    },
    notes: [],
    tabs: [DEFAULT_SESSION_TAB],
    adminTabs: DEFAULT_ADMIN_TABS,
  };
}
