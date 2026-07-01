import type { AdminTabMeta } from "./config-interfaces";

export const ADMIN_TAB_ICON_NAMES = [
  "ClipboardList",
  "Plus",
  "Calendar",
  "History",
  "RefreshCw",
  "SlidersHorizontal",
  "Users",
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
    id: "people",
    label: "People",
    iconName: "Users",
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
