"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DraggableList } from "@/components/ui/draggable-list";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { getAdminTabIcon } from "@/components/sports/admin-tab-icons";
import {
    clearUnsavedSettingsChanges,
    confirmLeaveWithUnsavedSettings,
    setUnsavedSettingsChanges,
} from "@/components/sports/settings-unsaved-guard";
import {
    ADMIN_TAB_DEFINITIONS,
    ADMIN_TAB_ICON_OPTIONS,
    getAdminTabDefinition,
    isAdminTabIconName,
    SETTINGS_TAB_ICON_NAME,
    SETTINGS_TAB_ID,
    SETTINGS_TAB_LABEL,
} from "@/config/admin-tab-metadata";
import {
    AccessLevel,
    PillColor,
    Role,
    type AdminTabMeta,
    type ResolvedSportConfig,
    type SignupConfirmationDialog,
} from "@/config/config-resolver";
import {
    createSessionTabId,
    SESSION_TAB_RULES,
} from "@/config/session-tab-rules";
import {
    updateSportConfig,
    type UpdateSportConfigInput,
} from "@/lib/actions/sport-config";
import { sessionPillClassFromColor } from "@/lib/session-type-pill";
import { toastClasses } from "@/lib/styles";
import { cn } from "@/lib/utils";

interface SportConfigFormProps {
    sport: string;
    source: "file" | "database";
    initialConfig: ResolvedSportConfig;
}

interface EditableTabPermissions {
    [AccessLevel.overview]: Role;
    [AccessLevel.view]: Role;
    [AccessLevel.signup]: Role;
    [AccessLevel.admin]: Role;
}

interface EditableTab {
    key: string;
    id: string;
    value: string;
    label: string;
    defaultTitlePrefix: string;
    sessionPillColor: PillColor;
    signupConfirmationDialog?: SignupConfirmationDialog;
    permissions: EditableTabPermissions;
}

interface EditableAdminTab extends AdminTabMeta {
    key: string;
    iconName: string;
}

interface SportConfigFormState {
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

interface AdminTabDraft {
    id: string;
    label: string;
    iconName: string;
}

type PendingDeleteTarget =
    | { kind: "session-tab"; key: string; label: string }
    | { kind: "admin-tab"; key: string; label: string };

const AUTO_DEFAULT_TAB_VALUE = "__auto-default-tab__";
const AUTO_DEFAULT_ADMIN_TAB_VALUE = "__auto-default-admin-tab__";

const ROLE_OPTIONS: Array<{ value: Role; label: string; description: string }> = [
    { value: Role.anon, label: "Anyone", description: "No sign-in required" },
    { value: Role.user, label: "Signed-in users", description: "Any authenticated user" },
    { value: Role.teamUser, label: "Team members", description: "Only users on the team roster" },
    { value: Role.admin, label: "Admins", description: "Sport admins only" },
];

const ACCESS_LEVEL_OPTIONS: Array<{ value: AccessLevel; label: string; description: string }> = [
    {
        value: AccessLevel.overview,
        label: "Overview",
        description: "Who can see this tab in summary areas.",
    },
    {
        value: AccessLevel.view,
        label: "View",
        description: "Who can open and view the tab.",
    },
    {
        value: AccessLevel.signup,
        label: "Signup",
        description: "Who can sign up for sessions of this type.",
    },
    {
        value: AccessLevel.admin,
        label: "Admin",
        description: "Who can run admin actions for this type.",
    },
];

const PILL_COLOR_OPTIONS: PillColor[] = [
    PillColor.gray,
    PillColor.emerald,
    PillColor.indigo,
    PillColor.amber,
    PillColor.blue,
    PillColor.rose,
    PillColor.teal,
    PillColor.violet,
];

function createKey(prefix: string): string {
    return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function createDefaultPermissions(): EditableTabPermissions {
    return {
        [AccessLevel.overview]: Role.anon,
        [AccessLevel.view]: Role.anon,
        [AccessLevel.signup]: Role.user,
        [AccessLevel.admin]: Role.admin,
    };
}

function createBlankTabDraft(): EditableTab {
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

function createEditableAdminTab(tab: AdminTabMeta): EditableAdminTab {
    return {
        key: createKey("admin-tab"),
        id: tab.id,
        label: tab.label,
        iconName: tab.iconName,
    };
}

function createAdminTabDraft(tabId?: string): AdminTabDraft {
    const fallbackDefinition = ADMIN_TAB_DEFINITIONS.find((definition) => definition.id !== SETTINGS_TAB_ID)
        ?? ADMIN_TAB_DEFINITIONS[0];
    const definition = (tabId ? getAdminTabDefinition(tabId) : undefined) ?? fallbackDefinition;

    return {
        id: definition?.id ?? "",
        label: definition?.label ?? "",
        iconName: definition?.iconName ?? ADMIN_TAB_ICON_OPTIONS[0]?.value ?? "Calendar",
    };
}

function toTabSlug(value: string): string {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function roleLabel(role: Role): string {
    return ROLE_OPTIONS.find((option) => option.value === role)?.label ?? "Unknown";
}

function summarizePermissions(permissions: EditableTabPermissions): string {
    return ACCESS_LEVEL_OPTIONS
        .map((option) => `${option.label}: ${roleLabel(permissions[option.value])}`)
        .join(" | ");
}

function buildInitialState(sport: string, config: ResolvedSportConfig): SportConfigFormState {
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

function updateTabByKey(
    tabs: EditableTab[],
    key: string,
    updater: (tab: EditableTab) => EditableTab,
): EditableTab[] {
    return tabs.map((tab) => (tab.key === key ? updater(tab) : tab));
}

export default function SportConfigForm({ sport, source, initialConfig }: SportConfigFormProps) {
    const initialState = useMemo(
        () => buildInitialState(sport, initialConfig),
        [sport, initialConfig],
    );

    const [state, setState] = useState(initialState);
    const [savedState, setSavedState] = useState(initialState);
    const [isPending, startTransition] = useTransition();

    const [tabDialogOpen, setTabDialogOpen] = useState(false);
    const [tabDialogMode, setTabDialogMode] = useState<"add" | "edit">("add");
    const [editingTabKey, setEditingTabKey] = useState<string | null>(null);
    const [tabDraft, setTabDraft] = useState<EditableTab>(() => createBlankTabDraft());

    const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
    const [permissionsTabKey, setPermissionsTabKey] = useState<string | null>(null);
    const [permissionsDraft, setPermissionsDraft] = useState<EditableTabPermissions>(() => createDefaultPermissions());

    const [adminTabDialogOpen, setAdminTabDialogOpen] = useState(false);
    const [adminTabDialogMode, setAdminTabDialogMode] = useState<"add" | "edit">("add");
    const [editingAdminTabKey, setEditingAdminTabKey] = useState<string | null>(null);
    const [adminTabDraft, setAdminTabDraft] = useState<AdminTabDraft>(() => createAdminTabDraft());
    const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingDeleteTarget | null>(null);

    useEffect(() => {
        setState(initialState);
        setSavedState(initialState);

        setTabDialogOpen(false);
        setPermissionsDialogOpen(false);
        setAdminTabDialogOpen(false);

        setEditingTabKey(null);
        setPermissionsTabKey(null);
        setEditingAdminTabKey(null);
        setPendingDeleteTarget(null);

        setTabDraft(createBlankTabDraft());
        setPermissionsDraft(createDefaultPermissions());
        setAdminTabDraft(createAdminTabDraft());
    }, [initialState]);

    const isDirty = JSON.stringify(state) !== JSON.stringify(savedState);

    useEffect(() => {
        setUnsavedSettingsChanges(isDirty);

        return () => {
            clearUnsavedSettingsChanges();
        };
    }, [isDirty]);

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const handleBeforeUnload = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };

        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [isDirty]);

    useEffect(() => {
        if (!isDirty) {
            return;
        }

        const handleDocumentClick = (event: MouseEvent) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const anchor = target.closest("a[href]");
            if (!(anchor instanceof HTMLAnchorElement)) {
                return;
            }

            if (anchor.target && anchor.target !== "_self") {
                return;
            }

            if (anchor.hasAttribute("download")) {
                return;
            }

            const nextUrl = new URL(anchor.href, window.location.href);
            const currentUrl = new URL(window.location.href);
            const isSameLocation = nextUrl.origin === currentUrl.origin
                && nextUrl.pathname === currentUrl.pathname
                && nextUrl.search === currentUrl.search
                && nextUrl.hash === currentUrl.hash;

            if (isSameLocation) {
                return;
            }

            if (!confirmLeaveWithUnsavedSettings()) {
                event.preventDefault();
                event.stopPropagation();
                return;
            }

            clearUnsavedSettingsChanges();
        };

        document.addEventListener("click", handleDocumentClick, true);

        return () => {
            document.removeEventListener("click", handleDocumentClick, true);
        };
    }, [isDirty]);

    const addableAdminTabDefinitions = useMemo(() => {
        const selected = new Set(state.adminTabs.map((tab) => tab.id));
        return ADMIN_TAB_DEFINITIONS.filter((definition) => (
            definition.id !== SETTINGS_TAB_ID && !selected.has(definition.id)
        ));
    }, [state.adminTabs]);

    const adminIconOptions = useMemo(() => {
        const options = ADMIN_TAB_ICON_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
        }));

        if (!adminTabDraft.iconName) {
            return options;
        }

        if (options.some((option) => option.value === adminTabDraft.iconName)) {
            return options;
        }

        return [
            {
                value: adminTabDraft.iconName,
                label: `${adminTabDraft.iconName} (current value)`,
            },
            ...options,
        ];
    }, [adminTabDraft.iconName]);

    const permissionEditingTab = permissionsTabKey
        ? state.tabs.find((tab) => tab.key === permissionsTabKey)
        : undefined;

    const defaultTabOptions = state.tabs
        .map((tab) => ({
            key: tab.key,
            label: tab.label,
            value: tab.value.trim(),
        }))
        .filter((tab) => tab.value.length > 0);

    const defaultTabValue = defaultTabOptions.some((tab) => tab.value === state.defaultTab)
        ? state.defaultTab
        : AUTO_DEFAULT_TAB_VALUE;

    const defaultAdminTabOptions = (() => {
        const options = [
            ...(source === "database"
                ? [{ value: SETTINGS_TAB_ID, label: SETTINGS_TAB_LABEL }]
                : []),
            ...state.adminTabs.map((tab) => ({
                value: tab.id.trim(),
                label: tab.label.trim() || tab.id.trim(),
            })),
        ].filter((tab) => tab.value.length > 0);

        const seen = new Set<string>();
        return options.filter((tab) => {
            if (seen.has(tab.value)) {
                return false;
            }

            seen.add(tab.value);
            return true;
        });
    })();

    const defaultAdminTabValue = defaultAdminTabOptions.some((tab) => tab.value === state.defaultAdminTab)
        ? state.defaultAdminTab
        : AUTO_DEFAULT_ADMIN_TAB_VALUE;

    const SettingsTabIcon = getAdminTabIcon(SETTINGS_TAB_ICON_NAME);

    const handleSave = () => {
        const trimmedTabs = state.tabs.map((tab) => ({
            id: tab.id.trim(),
            value: tab.value.trim(),
            label: tab.label.trim(),
            defaultTitlePrefix: tab.defaultTitlePrefix.trim(),
            sessionPillColor: tab.sessionPillColor,
            permissions: tab.permissions,
            signupConfirmationDialog: tab.signupConfirmationDialog
                ? {
                    maxRole: tab.signupConfirmationDialog.maxRole,
                    message: tab.signupConfirmationDialog.message.trim(),
                    rejectedMessage: tab.signupConfirmationDialog.rejectedMessage.trim(),
                }
                : undefined,
        }));

        if (trimmedTabs.length === 0) {
            toast.error("Add at least one session tab before saving.", {
                className: toastClasses.red,
            });
            return;
        }

        if (trimmedTabs.some((tab) => tab.value.length === 0 || tab.label.length === 0)) {
            toast.error("Every session tab needs both a label and value.", {
                className: toastClasses.red,
            });
            return;
        }

        if (trimmedTabs.some((tab) => tab.id.length === 0)) {
            toast.error("Every session tab needs an internal id.", {
                className: toastClasses.red,
            });
            return;
        }

        const normalizedTabIds = trimmedTabs.map((tab) => tab.id);
        if (new Set(normalizedTabIds).size !== normalizedTabIds.length) {
            toast.error("Session tab ids must be unique.", {
                className: toastClasses.red,
            });
            return;
        }

        const normalizedTabValues = trimmedTabs.map((tab) => tab.value.toLowerCase());
        if (new Set(normalizedTabValues).size !== normalizedTabValues.length) {
            toast.error("Session tab values must be unique.", {
                className: toastClasses.red,
            });
            return;
        }

        if (
            trimmedTabs.some((tab) => (
                tab.signupConfirmationDialog
                && (
                    tab.signupConfirmationDialog.message.length === 0
                    || tab.signupConfirmationDialog.rejectedMessage.length === 0
                )
            ))
        ) {
            toast.error("Signup confirmation fields cannot be empty.", {
                className: toastClasses.red,
            });
            return;
        }

        const defaultTab = state.defaultTab.trim();
        if (defaultTab.length > 0 && !trimmedTabs.some((tab) => tab.value === defaultTab)) {
            toast.error("Default tab must match one of the session tab values.", {
                className: toastClasses.red,
            });
            return;
        }

        const normalizedAdminTabs: UpdateSportConfigInput["adminTabs"] = [];
        for (const tab of state.adminTabs) {
            const id = tab.id.trim();
            const label = tab.label.trim();
            const iconName = tab.iconName.trim();

            if (!id || !label || !iconName) {
                toast.error("Every admin tab needs an id, label, and icon.", {
                    className: toastClasses.red,
                });
                return;
            }

            if (!isAdminTabIconName(iconName)) {
                toast.error(`Unsupported icon: ${iconName}. Choose from the icon list.`, {
                    className: toastClasses.red,
                });
                return;
            }

            normalizedAdminTabs.push({
                id,
                label,
                iconName,
            });
        }

        const adminTabIds = normalizedAdminTabs.map((tab) => tab.id);
        if (new Set(adminTabIds).size !== adminTabIds.length) {
            toast.error("Admin tabs cannot include duplicate tab types.", {
                className: toastClasses.red,
            });
            return;
        }

        const defaultAdminTab = state.defaultAdminTab.trim();
        const validDefaultAdminTabs = new Set<string>([
            SETTINGS_TAB_ID,
            ...normalizedAdminTabs.map((tab) => tab.id),
        ]);
        const normalizedDefaultAdminTab = defaultAdminTab.length > 0 && validDefaultAdminTabs.has(defaultAdminTab)
            ? defaultAdminTab
            : "";

        const notes = state.notesText
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.length > 0);

        const payload: UpdateSportConfigInput = {
            id: state.id,
            authEnabled: state.authEnabled,
            emoji: state.emoji.trim(),
            name: state.name.trim(),
            type: state.type.trim(),
            description: state.description.trim() || undefined,
            day: state.day.trim(),
            organizers: state.organizers.trim(),
            location: {
                name: state.locationName.trim(),
                address: state.locationAddress.trim(),
                mapsLink: state.locationMapsLink.trim() || undefined,
            },
            notes,
            defaultTab,
            defaultAdminTab: normalizedDefaultAdminTab,
            tabs: trimmedTabs.map((tab) => ({
                id: tab.id,
                value: tab.value,
                label: tab.label,
                defaultTitlePrefix: tab.defaultTitlePrefix || undefined,
                sessionPillColor: tab.sessionPillColor,
                permissions: tab.permissions,
                signupConfirmationDialog: tab.signupConfirmationDialog,
            })),
            adminTabs: normalizedAdminTabs,
        };

        startTransition(async () => {
            const result = await updateSportConfig(sport, payload);
            if (result.success) {
                setSavedState(structuredClone(state));
                toast.success("Sport config saved.", { className: toastClasses.green });
                return;
            }

            toast.error(result.error, { className: toastClasses.red });
        });
    };

    const openAddTabDialog = () => {
        setTabDialogMode("add");
        setEditingTabKey(null);
        setTabDraft(createBlankTabDraft());
        setTabDialogOpen(true);
    };

    const openEditTabDialog = (tabKey: string) => {
        const tab = state.tabs.find((entry) => entry.key === tabKey);
        if (!tab) {
            return;
        }

        setTabDialogMode("edit");
        setEditingTabKey(tabKey);
        setTabDraft(structuredClone(tab));
        setTabDialogOpen(true);
    };

    const saveTabDraft = () => {
        const previousTab = editingTabKey
            ? state.tabs.find((tab) => tab.key === editingTabKey)
            : undefined;
        const lockTabValue = SESSION_TAB_RULES.valueImmutableAfterCreate && tabDialogMode === "edit";
        const nextValue = lockTabValue
            ? (previousTab?.value.trim() ?? "")
            : tabDraft.value.trim();
        const nextLabel = tabDraft.label.trim();
        const nextTitlePrefix = tabDraft.defaultTitlePrefix.trim();
        const nextSignupDialog = tabDraft.signupConfirmationDialog
            ? {
                maxRole: tabDraft.signupConfirmationDialog.maxRole,
                message: tabDraft.signupConfirmationDialog.message.trim(),
                rejectedMessage: tabDraft.signupConfirmationDialog.rejectedMessage.trim(),
            }
            : undefined;

        if (nextValue.length === 0 || nextLabel.length === 0) {
            toast.error("Tab label and value are required.", { className: toastClasses.red });
            return;
        }

        const duplicate = state.tabs.some((tab) => (
            tab.key !== editingTabKey
            && tab.value.trim().toLowerCase() === nextValue.toLowerCase()
        ));
        if (duplicate) {
            toast.error("That tab value is already in use.", { className: toastClasses.red });
            return;
        }

        if (
            nextSignupDialog
            && (nextSignupDialog.message.length === 0 || nextSignupDialog.rejectedMessage.length === 0)
        ) {
            toast.error("Signup confirmation fields cannot be empty.", {
                className: toastClasses.red,
            });
            return;
        }

        const normalized: EditableTab = {
            ...tabDraft,
            value: nextValue,
            label: nextLabel,
            defaultTitlePrefix: nextTitlePrefix,
            signupConfirmationDialog: nextSignupDialog,
        };

        setState((prev) => {
            if (tabDialogMode === "add") {
                const nextTabs = [...prev.tabs, normalized];
                return {
                    ...prev,
                    tabs: nextTabs,
                    defaultTab: prev.defaultTab || nextValue,
                };
            }

            if (!editingTabKey) {
                return prev;
            }

            const previousTab = prev.tabs.find((tab) => tab.key === editingTabKey);
            if (!previousTab) {
                return prev;
            }

            return {
                ...prev,
                tabs: updateTabByKey(prev.tabs, editingTabKey, () => normalized),
                defaultTab: prev.defaultTab === previousTab.value ? nextValue : prev.defaultTab,
            };
        });

        setTabDialogOpen(false);
    };

    const openPermissionsDialog = (tabKey: string) => {
        const tab = state.tabs.find((entry) => entry.key === tabKey);
        if (!tab) {
            return;
        }

        setPermissionsTabKey(tabKey);
        setPermissionsDraft(structuredClone(tab.permissions));
        setPermissionsDialogOpen(true);
    };

    const savePermissionsDraft = () => {
        if (!permissionsTabKey) {
            return;
        }

        setState((prev) => ({
            ...prev,
            tabs: updateTabByKey(prev.tabs, permissionsTabKey, (tab) => ({
                ...tab,
                permissions: permissionsDraft,
            })),
        }));

        setPermissionsDialogOpen(false);
    };

    const requestDeleteTab = (tabKey: string) => {
        const tab = state.tabs.find((entry) => entry.key === tabKey);
        if (!tab) {
            return;
        }

        if (state.tabs.length <= 1) {
            toast.error("At least one session tab is required.", {
                className: toastClasses.red,
            });
            return;
        }

        setPendingDeleteTarget({
            kind: "session-tab",
            key: tabKey,
            label: tab.label.trim() || tab.value.trim() || "Untitled tab",
        });
    };

    const deleteTabByKey = (tabKey: string) => {
        if (state.tabs.length <= 1) {
            toast.error("At least one session tab is required.", {
                className: toastClasses.red,
            });
            return;
        }

        setState((prev) => {
            const removedTab = prev.tabs.find((tab) => tab.key === tabKey);
            if (!removedTab) {
                return prev;
            }

            const nextTabs = prev.tabs.filter((tab) => tab.key !== tabKey);
            return {
                ...prev,
                tabs: nextTabs,
                defaultTab: prev.defaultTab === removedTab.value ? (nextTabs[0]?.value ?? "") : prev.defaultTab,
            };
        });
    };

    const openAddAdminTabDialog = () => {
        if (addableAdminTabDefinitions.length === 0) {
            toast.message("All available admin tabs are already added.");
            return;
        }

        const firstDefinition = addableAdminTabDefinitions[0];
        setAdminTabDialogMode("add");
        setEditingAdminTabKey(null);
        setAdminTabDraft(createAdminTabDraft(firstDefinition.id));
        setAdminTabDialogOpen(true);
    };

    const openEditAdminTabDialog = (tabKey: string) => {
        const tab = state.adminTabs.find((entry) => entry.key === tabKey);
        if (!tab) {
            return;
        }

        setAdminTabDialogMode("edit");
        setEditingAdminTabKey(tabKey);
        setAdminTabDraft({
            id: tab.id,
            label: tab.label,
            iconName: tab.iconName,
        });
        setAdminTabDialogOpen(true);
    };

    const saveAdminTabDraft = () => {
        const nextId = adminTabDraft.id.trim();
        const nextLabel = adminTabDraft.label.trim();
        const nextIconName = adminTabDraft.iconName.trim();

        if (nextId.length === 0 || nextLabel.length === 0 || nextIconName.length === 0) {
            toast.error("Admin tab type, label, and icon are required.", {
                className: toastClasses.red,
            });
            return;
        }

        const duplicate = state.adminTabs.some((tab) => (
            tab.key !== editingAdminTabKey
            && tab.id === nextId
        ));
        if (duplicate) {
            toast.error("That admin tab already exists.", {
                className: toastClasses.red,
            });
            return;
        }

        setState((prev) => {
            if (adminTabDialogMode === "add") {
                return {
                    ...prev,
                    adminTabs: [
                        ...prev.adminTabs,
                        {
                            key: createKey("admin-tab"),
                            id: nextId,
                            label: nextLabel,
                            iconName: nextIconName,
                        },
                    ],
                };
            }

            if (!editingAdminTabKey) {
                return prev;
            }

            return {
                ...prev,
                adminTabs: prev.adminTabs.map((tab) => (
                    tab.key === editingAdminTabKey
                        ? {
                            ...tab,
                            label: nextLabel,
                            iconName: nextIconName,
                        }
                        : tab
                )),
            };
        });

        setAdminTabDialogOpen(false);
    };

    const requestDeleteAdminTab = (tabKey: string) => {
        const tab = state.adminTabs.find((entry) => entry.key === tabKey);
        if (!tab) {
            return;
        }

        setPendingDeleteTarget({
            kind: "admin-tab",
            key: tabKey,
            label: tab.label.trim() || tab.id,
        });
    };

    const deleteAdminTabByKey = (tabKey: string) => {
        setState((prev) => {
            const removedTab = prev.adminTabs.find((tab) => tab.key === tabKey);
            const nextAdminTabs = prev.adminTabs.filter((tab) => tab.key !== tabKey);

            return {
                ...prev,
                adminTabs: nextAdminTabs,
                defaultAdminTab: removedTab && prev.defaultAdminTab === removedTab.id
                    ? ""
                    : prev.defaultAdminTab,
            };
        });
    };

    const confirmDeleteTarget = () => {
        if (!pendingDeleteTarget) {
            return;
        }

        if (pendingDeleteTarget.kind === "session-tab") {
            deleteTabByKey(pendingDeleteTarget.key);
        } else {
            deleteAdminTabByKey(pendingDeleteTarget.key);
        }

        setPendingDeleteTarget(null);
    };

    return (
        <section className="space-y-4">
            <div className="rounded-lg border bg-card p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">Sport Config Settings</h3>
                    <p className="text-sm text-muted-foreground">
                        Edit and save sport-level settings. Unknown JSON keys are preserved on save.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="sport-id">ID</Label>
                        <Input id="sport-id" value={state.id} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="source">Source</Label>
                        <Input id="source" value={source} disabled />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="emoji">Emoji</Label>
                        <Input
                            id="emoji"
                            value={state.emoji}
                            onChange={(event) => setState((prev) => ({ ...prev, emoji: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={state.name}
                            onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="type">Type</Label>
                        <Input
                            id="type"
                            value={state.type}
                            onChange={(event) => setState((prev) => ({ ...prev, type: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            rows={2}
                            value={state.description}
                            onChange={(event) => setState((prev) => ({ ...prev, description: event.target.value }))}
                        />
                    </div>
                    <div className="flex items-center gap-2 sm:col-span-2">
                        <input
                            id="auth-enabled"
                            type="checkbox"
                            checked={state.authEnabled}
                            onChange={(event) => setState((prev) => ({ ...prev, authEnabled: event.target.checked }))}
                            className="h-4 w-4 rounded border-input"
                        />
                        <Label htmlFor="auth-enabled">Auth enabled</Label>
                    </div>
                </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Display and Logistics</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="day">Day</Label>
                        <Input
                            id="day"
                            value={state.day}
                            onChange={(event) => setState((prev) => ({ ...prev, day: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="organizers">Organizers</Label>
                        <Input
                            id="organizers"
                            value={state.organizers}
                            onChange={(event) => setState((prev) => ({ ...prev, organizers: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location-name">Location name</Label>
                        <Input
                            id="location-name"
                            value={state.locationName}
                            onChange={(event) => setState((prev) => ({ ...prev, locationName: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location-address">Location address</Label>
                        <Input
                            id="location-address"
                            value={state.locationAddress}
                            onChange={(event) => setState((prev) => ({ ...prev, locationAddress: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="maps-link">Location maps link</Label>
                        <Input
                            id="maps-link"
                            value={state.locationMapsLink}
                            onChange={(event) => setState((prev) => ({ ...prev, locationMapsLink: event.target.value }))}
                        />
                    </div>
                    <div className="space-y-2 sm:col-span-2">
                        <Label htmlFor="notes">Notes (one per line)</Label>
                        <Textarea
                            id="notes"
                            rows={6}
                            value={state.notesText}
                            onChange={(event) => setState((prev) => ({ ...prev, notesText: event.target.value }))}
                        />
                    </div>
                </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">Session Tabs</h3>
                    <p className="text-sm text-muted-foreground">
                        Drag to reorder tabs. Edit tab details and permissions separately so each step stays simple.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="default-tab">Default tab</Label>
                    <Select
                        value={defaultTabValue}
                        onValueChange={(value) => setState((prev) => ({
                            ...prev,
                            defaultTab: value === AUTO_DEFAULT_TAB_VALUE ? "" : value,
                        }))}
                    >
                        <SelectTrigger id="default-tab">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={AUTO_DEFAULT_TAB_VALUE}>Auto (first tab)</SelectItem>
                            {defaultTabOptions.map((tab) => (
                                <SelectItem key={tab.key} value={tab.value}>
                                    {tab.label} ({tab.value})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <DraggableList
                    items={state.tabs}
                    onReorder={(tabs) => setState((prev) => ({ ...prev, tabs }))}
                    keyExtractor={(tab) => tab.key}
                    renderItem={(tab, index) => {
                        const isDefault = state.defaultTab
                            ? tab.value === state.defaultTab
                            : index === 0;

                        return (
                            <>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="text-sm font-medium text-foreground">
                                            {tab.label || "Untitled tab"}
                                        </span>
                                        <Badge variant="outline">{tab.value || "no-value"}</Badge>
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "rounded-full border font-normal shadow-none",
                                                sessionPillClassFromColor(tab.sessionPillColor),
                                            )}
                                        >
                                            {tab.sessionPillColor}
                                        </Badge>
                                        {isDefault && (
                                            <Badge variant="secondary">Default</Badge>
                                        )}
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Auto session title text: {tab.defaultTitlePrefix || "(uses tab name)"}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Permissions: {summarizePermissions(tab.permissions)}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => openEditTabDialog(tab.key)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => openPermissionsDialog(tab.key)}
                                    >
                                        <Shield className="h-3.5 w-3.5 mr-1" />
                                        Permissions
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-destructive hover:text-destructive"
                                        onClick={() => requestDeleteTab(tab.key)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </>
                        );
                    }}
                />

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={openAddTabDialog}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Session Tab
                </Button>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">Admin Tabs</h3>
                    <p className="text-sm text-muted-foreground">
                        Choose which admin pages appear in the sidebar, then drag to reorder them.
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Settings is pinned first and managed by the system.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="default-admin-tab">Default admin tab</Label>
                    <Select
                        value={defaultAdminTabValue}
                        onValueChange={(value) => setState((prev) => ({
                            ...prev,
                            defaultAdminTab: value === AUTO_DEFAULT_ADMIN_TAB_VALUE ? "" : value,
                        }))}
                    >
                        <SelectTrigger id="default-admin-tab">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={AUTO_DEFAULT_ADMIN_TAB_VALUE}>
                                Auto (Settings)
                            </SelectItem>
                            {defaultAdminTabOptions.map((tab) => (
                                <SelectItem key={`default-admin-tab-${tab.value}`} value={tab.value}>
                                    {tab.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                        Used when opening admin without a tab in the URL. Auto opens Settings.
                    </p>
                </div>

                {source === "database" && (
                    <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2">
                        <div className="flex-1 min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <SettingsTabIcon className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium text-foreground">{SETTINGS_TAB_LABEL}</span>
                                <Badge variant="outline">{SETTINGS_TAB_ID}</Badge>
                                <Badge variant="secondary">Pinned first</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                This tab is always shown first and cannot be edited, removed, or reordered here.
                            </p>
                        </div>
                    </div>
                )}

                <DraggableList
                    items={state.adminTabs}
                    onReorder={(adminTabs) => setState((prev) => ({ ...prev, adminTabs }))}
                    keyExtractor={(tab) => tab.key}
                    renderItem={(tab) => {
                        const Icon = getAdminTabIcon(tab.iconName);
                        const definition = getAdminTabDefinition(tab.id);

                        return (
                            <>
                                <div className="flex-1 min-w-0 space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Icon className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">{tab.label}</span>
                                        <Badge variant="outline">{tab.id}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        {definition?.description ?? "Custom admin tab id from existing config."}
                                    </p>
                                </div>

                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2"
                                        onClick={() => openEditAdminTabDialog(tab.key)}
                                    >
                                        <Pencil className="h-3.5 w-3.5 mr-1" />
                                        Edit
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 px-2 text-destructive hover:text-destructive"
                                        onClick={() => requestDeleteAdminTab(tab.key)}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                            </>
                        );
                    }}
                />

                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={openAddAdminTabDialog}
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Admin Tab
                </Button>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty}
                    onClick={() => {
                        setState(structuredClone(savedState));
                        setTabDialogOpen(false);
                        setPermissionsDialogOpen(false);
                        setAdminTabDialogOpen(false);
                        setPendingDeleteTarget(null);
                    }}
                >
                    Reset
                </Button>
                <Button
                    type="button"
                    disabled={!isDirty || isPending}
                    onClick={handleSave}
                >
                    {isPending ? "Saving..." : "Save"}
                </Button>
                <span className="text-xs text-muted-foreground">
                    {isDirty ? "Unsaved local changes" : "No local changes"}
                </span>
            </div>

            <Dialog open={tabDialogOpen} onOpenChange={setTabDialogOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {tabDialogMode === "add" ? "Add Session Tab" : "Edit Session Tab"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Manage session tab details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="tab-label">Session Type Name</Label>
                                <Input
                                    id="tab-label"
                                    value={tabDraft.label}
                                    onChange={(event) => setTabDraft((prev) => ({
                                        ...prev,
                                        label: event.target.value,
                                    }))}
                                    placeholder="e.g. Open Gym"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Players see this as the tab name on the sport page. eg. "Practices"
                                </p>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <Label htmlFor="tab-value">Tab value</Label>
                                    {tabDialogMode === "add" && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 px-2 text-xs"
                                            onClick={() => setTabDraft((prev) => ({
                                                ...prev,
                                                value: toTabSlug(prev.label),
                                            }))}
                                        >
                                            Generate from label
                                        </Button>
                                    )}
                                </div>
                                <Input
                                    id="tab-value"
                                    value={tabDraft.value}
                                    disabled={SESSION_TAB_RULES.valueImmutableAfterCreate && tabDialogMode === "edit"}
                                    onChange={(event) => setTabDraft((prev) => ({
                                        ...prev,
                                        value: event.target.value,
                                    }))}
                                    placeholder="e.g. open-gym"
                                />
                                {SESSION_TAB_RULES.valueImmutableAfterCreate && tabDialogMode === "edit" && (
                                    <p className="text-xs text-muted-foreground">
                                        Tab value is fixed after creation.
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tab-title-prefix">Text used in auto session titles</Label>
                                <Input
                                    id="tab-title-prefix"
                                    value={tabDraft.defaultTitlePrefix}
                                    onChange={(event) => setTabDraft((prev) => ({
                                        ...prev,
                                        defaultTitlePrefix: event.target.value,
                                    }))}
                                    placeholder="Leave blank to use tab text"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Used when a session title is empty (eg, "Practice" for "Practice: Jan 5").
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="tab-pill-color">Session pill color</Label>
                                <Select
                                    value={tabDraft.sessionPillColor}
                                    onValueChange={(value) => setTabDraft((prev) => ({
                                        ...prev,
                                        sessionPillColor: value as PillColor,
                                    }))}
                                >
                                    <SelectTrigger id="tab-pill-color">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PILL_COLOR_OPTIONS.map((pillColor) => (
                                            <SelectItem key={pillColor} value={pillColor}>
                                                <div className="flex items-center gap-2">
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "rounded-full border font-normal shadow-none",
                                                            sessionPillClassFromColor(pillColor),
                                                        )}
                                                    >
                                                        {pillColor}
                                                    </Badge>
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="rounded-md border p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <input
                                    id="tab-signup-dialog-enabled"
                                    type="checkbox"
                                    className="h-4 w-4 rounded border-input"
                                    checked={!!tabDraft.signupConfirmationDialog}
                                    onChange={(event) => {
                                        if (event.target.checked) {
                                            setTabDraft((prev) => ({
                                                ...prev,
                                                signupConfirmationDialog: prev.signupConfirmationDialog ?? {
                                                    maxRole: Role.user,
                                                    message: "Are you eligible for this session?",
                                                    rejectedMessage: "Please contact an admin if you believe this is an error.",
                                                },
                                            }));
                                            return;
                                        }

                                        setTabDraft((prev) => ({
                                            ...prev,
                                            signupConfirmationDialog: undefined,
                                        }));
                                    }}
                                />
                                <Label htmlFor="tab-signup-dialog-enabled">
                                    Show signup confirmation prompt for this tab
                                </Label>
                            </div>

                            {tabDraft.signupConfirmationDialog && (
                                <div className="grid gap-3">
                                    <div className="space-y-2">
                                        <Label htmlFor="tab-signup-max-role">Prompt users up to role</Label>
                                        <Select
                                            value={String(tabDraft.signupConfirmationDialog.maxRole)}
                                            onValueChange={(value) => setTabDraft((prev) => ({
                                                ...prev,
                                                signupConfirmationDialog: prev.signupConfirmationDialog
                                                    ? {
                                                        ...prev.signupConfirmationDialog,
                                                        maxRole: Number(value) as Role,
                                                    }
                                                    : undefined,
                                            }))}
                                        >
                                            <SelectTrigger id="tab-signup-max-role">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLE_OPTIONS.map((option) => (
                                                    <SelectItem key={`max-role-${option.value}`} value={String(option.value)}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tab-signup-message">Prompt message</Label>
                                        <Textarea
                                            id="tab-signup-message"
                                            rows={2}
                                            value={tabDraft.signupConfirmationDialog.message}
                                            onChange={(event) => setTabDraft((prev) => ({
                                                ...prev,
                                                signupConfirmationDialog: prev.signupConfirmationDialog
                                                    ? {
                                                        ...prev.signupConfirmationDialog,
                                                        message: event.target.value,
                                                    }
                                                    : undefined,
                                            }))}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="tab-signup-rejected-message">Rejected message</Label>
                                        <Textarea
                                            id="tab-signup-rejected-message"
                                            rows={2}
                                            value={tabDraft.signupConfirmationDialog.rejectedMessage}
                                            onChange={(event) => setTabDraft((prev) => ({
                                                ...prev,
                                                signupConfirmationDialog: prev.signupConfirmationDialog
                                                    ? {
                                                        ...prev.signupConfirmationDialog,
                                                        rejectedMessage: event.target.value,
                                                    }
                                                    : undefined,
                                            }))}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setTabDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveTabDraft}>
                            {tabDialogMode === "add" ? "Add tab" : "Done"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={permissionsDialogOpen} onOpenChange={setPermissionsDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            Tab Permissions{permissionEditingTab ? `: ${permissionEditingTab.label}` : ""}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Manage access levels for this session tab.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3">
                        {ACCESS_LEVEL_OPTIONS.map((accessLevel) => (
                            <div key={`permission-${accessLevel.value}`} className="space-y-2">
                                <Label>{accessLevel.label}</Label>
                                <p className="text-xs text-muted-foreground">{accessLevel.description}</p>
                                <Select
                                    value={String(permissionsDraft[accessLevel.value])}
                                    onValueChange={(value) => setPermissionsDraft((prev) => ({
                                        ...prev,
                                        [accessLevel.value]: Number(value) as Role,
                                    }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLE_OPTIONS.map((roleOption) => (
                                            <SelectItem
                                                key={`${accessLevel.value}-${roleOption.value}`}
                                                value={String(roleOption.value)}
                                            >
                                                {roleOption.label} - {roleOption.description}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        ))}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setPermissionsDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={savePermissionsDraft}>
                            Done
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={adminTabDialogOpen} onOpenChange={setAdminTabDialogOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>
                            {adminTabDialogMode === "add" ? "Add Admin Tab" : "Edit Admin Tab"}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            Manage admin sidebar tab metadata.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {adminTabDialogMode === "add" ? (
                            <div className="space-y-2">
                                <Label htmlFor="admin-tab-type">Admin page</Label>
                                <Select
                                    value={adminTabDraft.id}
                                    onValueChange={(value) => {
                                        const definition = getAdminTabDefinition(value);
                                        setAdminTabDraft((prev) => ({
                                            ...prev,
                                            id: value,
                                            label: definition?.label ?? prev.label,
                                            iconName: definition?.iconName ?? prev.iconName,
                                        }));
                                    }}
                                >
                                    <SelectTrigger id="admin-tab-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {addableAdminTabDefinitions.map((definition) => (
                                            <SelectItem key={definition.id} value={definition.id}>
                                                {definition.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    {getAdminTabDefinition(adminTabDraft.id)?.description ?? "Choose an available admin page."}
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Label>Admin page</Label>
                                <Input value={adminTabDraft.id} disabled />
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="admin-tab-label">Sidebar label</Label>
                            <Input
                                id="admin-tab-label"
                                value={adminTabDraft.label}
                                onChange={(event) => setAdminTabDraft((prev) => ({
                                    ...prev,
                                    label: event.target.value,
                                }))}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="admin-tab-icon">Icon</Label>
                            <Select
                                value={adminTabDraft.iconName}
                                onValueChange={(value) => setAdminTabDraft((prev) => ({
                                    ...prev,
                                    iconName: value,
                                }))}
                            >
                                <SelectTrigger id="admin-tab-icon">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {adminIconOptions.map((iconOption) => (
                                        <SelectItem key={`icon-${iconOption.value}`} value={iconOption.value}>
                                            {iconOption.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setAdminTabDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button type="button" onClick={saveAdminTabDraft}>
                            {adminTabDialogMode === "add" ? "Add admin tab" : "Done"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog
                open={pendingDeleteTarget !== null}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingDeleteTarget(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            {pendingDeleteTarget?.kind === "admin-tab"
                                ? "Delete admin tab?"
                                : "Delete session tab?"}
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingDeleteTarget?.kind === "admin-tab"
                                ? `This will remove "${pendingDeleteTarget.label}" from admin tabs.`
                                : `This will remove "${pendingDeleteTarget?.label ?? "this tab"}" from session tabs.`}{" "}
                            The change stays local until you apply updates from the main page button.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={confirmDeleteTarget}
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
