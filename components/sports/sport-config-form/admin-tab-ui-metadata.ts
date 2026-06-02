import {
    ADMIN_TAB_ICON_NAMES,
    SETTINGS_TAB_ICON_NAME,
    SETTINGS_TAB_ID,
    SETTINGS_TAB_LABEL,
    type AdminTabIconName,
} from "@/config/admin-tab-metadata";

export interface AdminTabDefinition {
    id: string;
    label: string;
    description: string;
    iconName: AdminTabIconName;
}

const ADMIN_TAB_ICON_OPTION_LABELS: Record<AdminTabIconName, string> = {
    ClipboardList: "Clipboard List",
    Plus: "Plus",
    Calendar: "Calendar",
    History: "History",
    RefreshCw: "Refresh",
    SlidersHorizontal: "Sliders",
};

export const ADMIN_TAB_ICON_OPTIONS: Array<{ value: AdminTabIconName; label: string }> =
    ADMIN_TAB_ICON_NAMES.map((iconName) => ({
        value: iconName,
        label: ADMIN_TAB_ICON_OPTION_LABELS[iconName],
    }));

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
    {
        id: SETTINGS_TAB_ID,
        label: SETTINGS_TAB_LABEL,
        description: "Sport-level settings editor.",
        iconName: SETTINGS_TAB_ICON_NAME,
    },
];

const adminTabDefinitionById: Record<string, AdminTabDefinition> = Object.fromEntries(
    ADMIN_TAB_DEFINITIONS.map((tab) => [tab.id, tab]),
);

export function getAdminTabDefinition(tabId: string): AdminTabDefinition | undefined {
    return adminTabDefinitionById[tabId];
}
