import {
    AccessLevel,
    PillColor,
    Role,
    type AdminTabMeta,
    type ResolvedSportConfig,
    type SignupConfirmationDialog,
} from "@/config/config-resolver";

export interface SportConfigFormProps {
    sport: string;
    initialConfig: ResolvedSportConfig;
}

export interface EditableTabPermissions {
    [AccessLevel.overview]: Role;
    [AccessLevel.view]: Role;
    [AccessLevel.signup]: Role;
    [AccessLevel.admin]: Role;
}

export interface EditableTab {
    key: string;
    id: string;
    value: string;
    label: string;
    defaultTitlePrefix: string;
    sessionPillColor: PillColor;
    signupConfirmationDialog?: SignupConfirmationDialog;
    permissions: EditableTabPermissions;
}

export interface EditableAdminTab extends AdminTabMeta {
    key: string;
    iconName: string;
}

export interface SportConfigFormState {
    id: string;
    authEnabled: boolean;
    emoji: string;
    name: string;
    type: string;
    description: string;
    day: string;
    organizers: string;
    locationName: string;
    locationAddress: string;
    locationMapsLink: string;
    notesText: string;
    defaultTab: string;
    defaultAdminTab: string;
    tabs: EditableTab[];
    adminTabs: EditableAdminTab[];
}

export interface AdminTabDraft {
    id: string;
    label: string;
    iconName: string;
}

export type PendingDeleteTarget =
    | { kind: "session-tab"; key: string; label: string }
    | { kind: "admin-tab"; key: string; label: string };

export type TabDialogMode = "add" | "edit";

export type AdminTabDialogMode = "add" | "edit";

export interface DefaultTabOption {
    key: string;
    label: string;
    value: string;
}

export interface DefaultAdminTabOption {
    value: string;
    label: string;
}
