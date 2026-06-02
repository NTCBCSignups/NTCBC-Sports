import type { AdminTabMeta } from "./config-interfaces";

export const ADMIN_TAB_ICON_NAMES = [
    "ClipboardList",
    "Plus",
    "Calendar",
    "History",
    "RefreshCw",
    "SlidersHorizontal",
] as const;

export type AdminTabIconName = (typeof ADMIN_TAB_ICON_NAMES)[number];

export const ADMIN_TAB_ICON_OPTIONS: Array<{ value: AdminTabIconName; label: string }> = [
    { value: "ClipboardList", label: "Clipboard List" },
    { value: "Plus", label: "Plus" },
    { value: "Calendar", label: "Calendar" },
    { value: "History", label: "History" },
    { value: "RefreshCw", label: "Refresh" },
    { value: "SlidersHorizontal", label: "Sliders" },
];

const adminTabIconNameSet = new Set<string>(ADMIN_TAB_ICON_NAMES);

export function isAdminTabIconName(value: string): value is AdminTabIconName {
    return adminTabIconNameSet.has(value);
}

export interface AdminTabDefinition {
    id: string;
    label: string;
    description: string;
    iconName: AdminTabIconName;
}

export const SETTINGS_TAB_ID = "settings";
export const SETTINGS_TAB_LABEL = "Settings";
export const SETTINGS_TAB_ICON_NAME: AdminTabIconName = "SlidersHorizontal";

export const SETTINGS_ADMIN_TAB: AdminTabMeta = {
    id: SETTINGS_TAB_ID,
    label: SETTINGS_TAB_LABEL,
    iconName: SETTINGS_TAB_ICON_NAME,
};

export const SETTINGS_ADMIN_TAB_DEFINITION: AdminTabDefinition = {
    id: SETTINGS_TAB_ID,
    label: SETTINGS_TAB_LABEL,
    iconName: SETTINGS_TAB_ICON_NAME,
    description: "Sport-level settings editor.",
};

export const ADMIN_TAB_DEFINITIONS: AdminTabDefinition[] = [
    {
        id: "requests",
        label: "Access Requests",
        description: "Review and approve access requests.",
        iconName: "ClipboardList",
    },
    {
        id: "create",
        label: "Create Session",
        description: "Create new sessions.",
        iconName: "Plus",
    },
    {
        id: "upcoming",
        label: "Upcoming Sessions",
        description: "Manage upcoming sessions.",
        iconName: "Calendar",
    },
    {
        id: "past",
        label: "Past Sessions",
        description: "Review and edit past sessions.",
        iconName: "History",
    },
    {
        id: "ccsa",
        label: "CCSA Sync",
        description: "Sync and manage CCSA data for softball workflows.",
        iconName: "RefreshCw",
    },
    SETTINGS_ADMIN_TAB_DEFINITION,
];

const DEFAULT_ADMIN_TAB_IDS = ["requests", "create", "upcoming", "past"] as const;

const adminTabDefinitionById: Record<string, AdminTabDefinition> = Object.fromEntries(
    ADMIN_TAB_DEFINITIONS.map((tab) => [tab.id, tab]),
);

export function getAdminTabDefinition(tabId: string): AdminTabDefinition | undefined {
    return adminTabDefinitionById[tabId];
}

export const DEFAULT_ADMIN_TABS: AdminTabMeta[] = DEFAULT_ADMIN_TAB_IDS.reduce<AdminTabMeta[]>(
    (tabs, id) => {
        const definition = getAdminTabDefinition(id);
        if (!definition) {
            return tabs;
        }

        tabs.push({
            id: definition.id,
            label: definition.label,
            iconName: definition.iconName,
        });

        return tabs;
    },
    [],
);
