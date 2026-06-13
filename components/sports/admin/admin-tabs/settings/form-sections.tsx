import { useState, type Dispatch, type SetStateAction } from "react";
import { CalendarDays, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getAdminTabIcon } from "@/components/sports/admin/admin-tab-icons";
import SessionCard from "@/components/sports/session/session-card";
import SessionTabPills from "@/components/sports/session/session-tab-pills";
import {
    SETTINGS_TAB_ICON_NAME,
    SETTINGS_TAB_ID,
    SETTINGS_TAB_LABEL,
} from "@/config/admin-tab-metadata";
import { AccessLevel, Role } from "@/config/config-resolver";
import { SESSION_STATUS } from "@/lib/supabase/types";
import type { SportSession } from "@/lib/supabase/types";
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

interface GeneralSettingsSectionProps {
    state: SportConfigFormState;
    setState: Dispatch<SetStateAction<SportConfigFormState>>;
}

export function GeneralSettingsSection({
    state,
    setState,
}: GeneralSettingsSectionProps) {
    const [showPreview, setShowPreview] = useState(false);

    return (
        <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">General</h3>
                <p className="text-sm text-muted-foreground">
                    Basic info and logistics for this sport.
                </p>
            </div>

            <div className="flex items-center gap-2 pt-4">
                <input
                    id="auth-enabled"
                    type="checkbox"
                    checked={state.authEnabled}
                    onChange={(event) => setState((prev) => ({ ...prev, authEnabled: event.target.checked }))}
                    className="h-4 w-4 rounded border-input"
                />
                <Label htmlFor="auth-enabled">Enable Google Login</Label>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 pt-4 min-w-0 [&>*]:min-w-0">
                <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                        id="name"
                        value={state.name}
                        onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="organizers">Organisers</Label>
                    <Input
                        id="organizers"
                        value={state.organizers}
                        onChange={(event) => setState((prev) => ({ ...prev, organizers: event.target.value }))}
                    />
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
                <div className="space-y-2">
                    <Label htmlFor="day">Schedule</Label>
                    <Input
                        id="day"
                        value={state.day}
                        onChange={(event) => setState((prev) => ({ ...prev, day: event.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location-name">Location</Label>
                    <Input
                        id="location-name"
                        value={state.locationName}
                        onChange={(event) => setState((prev) => ({ ...prev, locationName: event.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="location-address">Address</Label>
                    <Input
                        id="location-address"
                        value={state.locationAddress}
                        onChange={(event) => setState((prev) => ({ ...prev, locationAddress: event.target.value }))}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="maps-link">Maps link</Label>
                    <Input
                        id="maps-link"
                        value={state.locationMapsLink}
                        onChange={(event) => setState((prev) => ({ ...prev, locationMapsLink: event.target.value }))}
                    />
                </div>

            </div>

            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    {showPreview ? "Hide" : "Show"} preview
                </button>
                <div className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    showPreview ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}>
                    <div className="overflow-hidden">
                        <div className="rounded-lg border border-dashed bg-muted/30 p-4">
                            <Card className="max-w-sm overflow-hidden">
                                <CardHeader>
                                    <CardTitle className="text-2xl">
                                        {state.emoji} {state.name || "Sport Name"}
                                    </CardTitle>
                                    <CardDescription>{state.type || "Type"}</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm text-muted-foreground">
                                    {state.day && (
                                        <div className="flex items-center gap-2">
                                            <CalendarDays className="h-4 w-4" />
                                            <span>{state.day}</span>
                                        </div>
                                    )}
                                    {state.description && (
                                        <p>{state.description}</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
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
    const [showPreview, setShowPreview] = useState(false);

    return (
        <div className="rounded-lg border bg-card p-6 space-y-4">
            <div className="space-y-1">
                <h3 className="text-base font-semibold text-foreground">Sports Page</h3>
                <p className="text-sm text-muted-foreground">
                    Configure the public-facing page content and session tabs.
                </p>
            </div>

            <div className="space-y-2 pt-4">
                <Label htmlFor="notes">Notes (one per line)</Label>
                <Textarea
                    id="notes"
                    rows={6}
                    value={state.notesText}
                    onChange={(event) => setState((prev) => ({ ...prev, notesText: event.target.value }))}
                />
            </div>

            <div className="space-y-2 pt-4">
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
                itemClassName={() => "items-start flex-col gap-3 sm:flex-row sm:items-center"}
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

                            <div className="flex w-full items-center justify-end gap-1 shrink-0 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-2"
                                    onClick={() => openEditTabDialog(tab.key)}
                                >
                                    <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-2"
                                    onClick={() => openPermissionsDialog(tab.key)}
                                >
                                    <Shield className="h-3.5 w-3.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Permissions</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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

            <div className="space-y-2">
                <button
                    type="button"
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                    {showPreview ? "Hide" : "Show"} preview
                </button>
                <div className={cn(
                    "grid transition-[grid-template-rows] duration-300 ease-in-out",
                    showPreview ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                )}>
                    <div className="overflow-hidden">
                        <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-4">
                            <SessionTabPills
                                tabs={state.tabs.map((tab) => ({
                                    value: tab.value || tab.key,
                                    label: tab.label || "Untitled",
                                }))}
                                activeValue={state.defaultTab || state.tabs[0]?.value || ""}
                                interactive={false}
                            />

                            {state.tabs.length > 0 && (() => {
                                const firstTab = state.tabs[0]!;
                                const mockSession: SportSession & { signup_count: number } = {
                                    id: "preview",
                                    sport: state.id,
                                    session_type: firstTab.value,
                                    title: null,
                                    date: "2025-01-04",
                                    time_start: "19:00",
                                    time_end: "21:00",
                                    location_name: state.locationName || "Venue",
                                    location_address: state.locationAddress || "",
                                    location_maps_link: null,
                                    player_cap: 20,
                                    signup_open: new Date(Date.now() - 86400000).toISOString(),
                                    signup_close: new Date(Date.now() + 86400000).toISOString(),
                                    notes: null,
                                    status: SESSION_STATUS.active,
                                    status_notes: null,
                                    alt_session_views: [],
                                    created_by: null,
                                    created_at: new Date().toISOString(),
                                    signup_count: 8,
                                };
                                const mockTab = {
                                    value: firstTab.value,
                                    label: firstTab.label || "Untitled",
                                    defaultTitlePrefix: firstTab.defaultTitlePrefix || undefined,
                                    sessionPillColor: firstTab.sessionPillColor,
                                    permissions: {
                                        [AccessLevel.overview]: Role.anon,
                                        [AccessLevel.view]: Role.anon,
                                        [AccessLevel.signup]: Role.user,
                                        [AccessLevel.admin]: Role.admin,
                                    },
                                };
                                return (
                                    <div className="max-w-sm pointer-events-none">
                                        <SessionCard
                                            session={mockSession}
                                            tab={mockTab}
                                        />
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                </div>
            </div>
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
                <h3 className="text-base font-semibold text-foreground">Admin Page</h3>
                <p className="text-sm text-muted-foreground">
                    Choose which admin pages appear in the sidebar, then drag to reorder them.
                </p>
            </div>

            <div className="space-y-2 pt-4">
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
                itemClassName={() => "items-start flex-col gap-3 sm:flex-row sm:items-center"}
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

                            <div className="flex w-full items-center justify-end gap-1 shrink-0 sm:w-auto">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 sm:w-auto sm:px-2"
                                    onClick={() => openEditAdminTabDialog(tab.key)}
                                >
                                    <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                                    <span className="hidden sm:inline">Edit</span>
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
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
