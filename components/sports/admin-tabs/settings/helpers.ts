import {
    AccessLevel,
    PillColor,
    type AdminTabMeta,
    type ResolvedSportConfig,
    Role,
} from "@/config/config-resolver";
import {
    SETTINGS_TAB_ID,
} from "@/config/admin-tab-metadata";
import { createSessionTabId } from "@/config/session-tab-rules";
import {
    ADMIN_TAB_DEFINITIONS,
    ADMIN_TAB_ICON_OPTIONS,
    getAdminTabDefinition,
} from "./admin-tab-ui-metadata";
import {
    ACCESS_LEVEL_OPTIONS,
    ROLE_OPTIONS,
} from "./constants";
import type {
    AdminTabDraft,
    EditableAdminTab,
    EditableTab,
    EditableTabPermissions,
    SportConfigFormState,
} from "./types";

export function createKey(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createDefaultPermissions(): EditableTabPermissions {
    return {
        [AccessLevel.overview]: Role.anon,
        [AccessLevel.view]: Role.anon,
        [AccessLevel.signup]: Role.user,
        [AccessLevel.admin]: Role.admin,
    };
}

export function createBlankTabDraft(): EditableTab {
    return {
        key: createKey("tab"),
        id: createSessionTabId(),
        value: "",
        label: "",
        defaultTitlePrefix: "",
        sessionPillColor: PillColor.gray,
        permissions: createDefaultPermissions(),
        signupConfirmationDialog: undefined,
    };
}

export function createEditableAdminTab(tab: AdminTabMeta): EditableAdminTab {
    return {
        key: createKey("admin-tab"),
        id: tab.id,
        label: tab.label,
        iconName: tab.iconName,
    };
}

export function createAdminTabDraft(tabId?: string): AdminTabDraft {
    const fallbackDefinition = ADMIN_TAB_DEFINITIONS.find((definition) => definition.id !== SETTINGS_TAB_ID)
        ?? ADMIN_TAB_DEFINITIONS[0];
    const definition = (tabId ? getAdminTabDefinition(tabId) : undefined) ?? fallbackDefinition;

    return {
        id: definition?.id ?? "",
        label: definition?.label ?? "",
        iconName: definition?.iconName ?? ADMIN_TAB_ICON_OPTIONS[0]?.value ?? "Calendar",
    };
}

export function toTabSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function roleLabel(role: Role): string {
    return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Unknown";
}

export function summarizePermissions(permissions: EditableTabPermissions): string {
    return ACCESS_LEVEL_OPTIONS
        .map((option) => `${option.label}: ${roleLabel(permissions[option.value])}`)
        .join(" | ");
}

export function buildInitialState(sport: string, config: ResolvedSportConfig): SportConfigFormState {
    return {
        id: sport,
        authEnabled: config.authEnabled ?? false,
        emoji: config.emoji,
        name: config.name,
        type: config.type,
        description: config.description ?? "",
        day: config.day,
        organizers: config.organizers,
        locationName: config.location.name,
        locationAddress: config.location.address,
        locationMapsLink: config.location.mapsLink ?? "",
        notesText: (config.notes ?? []).join("\n"),
        defaultTab: config.defaultTab ?? "",
        defaultAdminTab: config.defaultAdminTab ?? "",
        tabs: (config.tabs ?? []).map((tab) => ({
            key: createKey("tab"),
            id: tab.id ?? createSessionTabId(),
            value: tab.value,
            label: tab.label,
            defaultTitlePrefix: tab.defaultTitlePrefix ?? "",
            sessionPillColor: tab.sessionPillColor,
            signupConfirmationDialog: tab.signupConfirmationDialog,
            permissions: {
                [AccessLevel.overview]: tab.permissions[AccessLevel.overview],
                [AccessLevel.view]: tab.permissions[AccessLevel.view],
                [AccessLevel.signup]: tab.permissions[AccessLevel.signup],
                [AccessLevel.admin]: tab.permissions[AccessLevel.admin],
            },
        })),
        adminTabs: (config.adminTabs ?? [])
            .filter((tab) => tab.id !== SETTINGS_TAB_ID)
            .map((tab) => createEditableAdminTab(tab)),
    };
}

export function updateTabByKey(
    tabs: EditableTab[],
    key: string,
    updater: (tab: EditableTab) => EditableTab,
): EditableTab[] {
    return tabs.map((tab) => (tab.key === key ? updater(tab) : tab));
}
