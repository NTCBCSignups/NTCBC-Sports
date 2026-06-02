import type { Dispatch, SetStateAction } from "react";
import { Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DraggableList } from "@/components/ui/draggable-list";
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
    SETTINGS_TAB_ICON_NAME,
    SETTINGS_TAB_ID,
    SETTINGS_TAB_LABEL,
} from "@/config/admin-tab-metadata";
import { sessionPillClassFromColor } from "@/lib/session-type-pill";
import { cn } from "@/lib/utils";
import { getAdminTabDefinition } from "./admin-tab-ui-metadata";
import {
    AUTO_DEFAULT_ADMIN_TAB_VALUE,
    AUTO_DEFAULT_TAB_VALUE,
} from "./constants";
import { summarizePermissions } from "./helpers";
import type {
    DefaultAdminTabOption,
    DefaultTabOption,
    SportConfigFormState,
} from "./types";

interface SportConfigSettingsSectionProps {
    state: SportConfigFormState;
    setState: Dispatch<SetStateAction<SportConfigFormState>>;
}

export function SportConfigSettingsSection({
    state,
    setState,
}: SportConfigSettingsSectionProps) {
    return (
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
    );
}

interface DisplayAndLogisticsSectionProps {
    state: SportConfigFormState;
    setState: Dispatch<SetStateAction<SportConfigFormState>>;
}

export function DisplayAndLogisticsSection({ state, setState }: DisplayAndLogisticsSectionProps) {
    return (
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
    );
}

interface SessionTabsSectionProps {
    state: SportConfigFormState;
    setState: Dispatch<SetStateAction<SportConfigFormState>>;
    defaultTabValue: string;
    defaultTabOptions: DefaultTabOption[];
    openEditTabDialog: (tabKey: string) => void;
    openPermissionsDialog: (tabKey: string) => void;
    requestDeleteTab: (tabKey: string) => void;
    openAddTabDialog: () => void;
}

export function SessionTabsSection({
    state,
    setState,
    defaultTabValue,
    defaultTabOptions,
    openEditTabDialog,
    openPermissionsDialog,
    requestDeleteTab,
    openAddTabDialog,
}: SessionTabsSectionProps) {
    return (
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
    );
}

interface AdminTabsSectionProps {
    state: SportConfigFormState;
    setState: Dispatch<SetStateAction<SportConfigFormState>>;
    defaultAdminTabValue: string;
    defaultAdminTabOptions: DefaultAdminTabOption[];
    openEditAdminTabDialog: (tabKey: string) => void;
    requestDeleteAdminTab: (tabKey: string) => void;
    openAddAdminTabDialog: () => void;
}

export function AdminTabsSection({
    state,
    setState,
    defaultAdminTabValue,
    defaultAdminTabOptions,
    openEditAdminTabDialog,
    requestDeleteAdminTab,
    openAddAdminTabDialog,
}: AdminTabsSectionProps) {
    const SettingsTabIcon = getAdminTabIcon(SETTINGS_TAB_ICON_NAME);

    return (
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
    );
}

interface FormActionsRowProps {
    isDirty: boolean;
    isPending: boolean;
    onReset: () => void;
    onSave: () => void;
}

export function FormActionsRow({
    isDirty,
    isPending,
    onReset,
    onSave,
}: FormActionsRowProps) {
    return (
        <div className="flex items-center gap-2">
            <Button
                type="button"
                variant="outline"
                disabled={!isDirty}
                onClick={onReset}
            >
                Reset
            </Button>
            <Button
                type="button"
                disabled={!isDirty || isPending}
                onClick={onSave}
            >
                {isPending ? "Saving..." : "Save"}
            </Button>
            <span className="text-xs text-muted-foreground">
                {isDirty ? "Unsaved local changes" : "No local changes"}
            </span>
        </div>
    );
}
