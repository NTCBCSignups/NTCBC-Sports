"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AccessLevel,
    PillColor,
    Role,
    type AdminTabMeta,
    type ResolvedSportConfig,
} from "@/config/config-resolver";

interface SportConfigFormProps {
    sport: string;
    source: "file" | "database";
    initialConfig: ResolvedSportConfig;
}

interface EditableTab {
    value: string;
    label: string;
    defaultTitlePrefix: string;
    sessionPillColor: PillColor;
    permissions: {
        overview: Role;
        view: Role;
        signup: Role;
        admin: Role;
    };
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
    tabs: EditableTab[];
    adminTabs: AdminTabMeta[];
}

const ROLE_OPTIONS: Array<{ value: Role; label: string }> = [
    { value: Role.anon, label: "Anon" },
    { value: Role.user, label: "User" },
    { value: Role.teamUser, label: "Team User" },
    { value: Role.admin, label: "Admin" },
];

const PILL_COLOR_OPTIONS: PillColor[] = [
    PillColor.gray,
    PillColor.emerald,
    PillColor.indigo,
    PillColor.amber,
];

function buildInitialState(sport: string, config: ResolvedSportConfig): SportConfigFormState {
    return {
        id: sport,
        authEnabled: config.authEnabled,
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
        tabs: (config.tabs ?? []).map((tab) => ({
            value: tab.value,
            label: tab.label,
            defaultTitlePrefix: tab.defaultTitlePrefix ?? "",
            sessionPillColor: tab.sessionPillColor,
            permissions: {
                overview: tab.permissions[AccessLevel.overview],
                view: tab.permissions[AccessLevel.view],
                signup: tab.permissions[AccessLevel.signup],
                admin: tab.permissions[AccessLevel.admin],
            },
        })),
        adminTabs: [...(config.adminTabs ?? [])],
    };
}

function updateTab(
    tabs: EditableTab[],
    index: number,
    updater: (tab: EditableTab) => EditableTab,
): EditableTab[] {
    return tabs.map((tab, tabIndex) => (tabIndex === index ? updater(tab) : tab));
}

export default function SportConfigForm({ sport, source, initialConfig }: SportConfigFormProps) {
    const initialState = useMemo(
        () => buildInitialState(sport, initialConfig),
        [sport, initialConfig],
    );
    const [state, setState] = useState(initialState);

    useEffect(() => {
        setState(initialState);
    }, [initialState]);

    const isDirty = JSON.stringify(state) !== JSON.stringify(initialState);

    return (
        <section className="space-y-4">
            <div className="rounded-lg border bg-card p-6 space-y-4">
                <div className="space-y-1">
                    <h3 className="text-base font-semibold text-foreground">Sport Config Settings</h3>
                    <p className="text-sm text-muted-foreground">
                        Changes are local-only in this implementation slice. Save wiring is added next.
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
                <h3 className="text-base font-semibold text-foreground">Session Tabs</h3>
                <div className="space-y-2">
                    <Label htmlFor="default-tab">Default tab</Label>
                    <Input
                        id="default-tab"
                        value={state.defaultTab}
                        onChange={(event) => setState((prev) => ({ ...prev, defaultTab: event.target.value }))}
                    />
                </div>

                <div className="space-y-4">
                    {state.tabs.map((tab, index) => (
                        <div key={`${tab.value}-${index}`} className="rounded-md border p-4 space-y-3">
                            <div className="grid gap-3 sm:grid-cols-3">
                                <div className="space-y-2">
                                    <Label>Tab value</Label>
                                    <Input
                                        value={tab.value}
                                        onChange={(event) => setState((prev) => ({
                                            ...prev,
                                            tabs: updateTab(prev.tabs, index, (current) => ({
                                                ...current,
                                                value: event.target.value,
                                            })),
                                        }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Tab label</Label>
                                    <Input
                                        value={tab.label}
                                        onChange={(event) => setState((prev) => ({
                                            ...prev,
                                            tabs: updateTab(prev.tabs, index, (current) => ({
                                                ...current,
                                                label: event.target.value,
                                            })),
                                        }))}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Title prefix</Label>
                                    <Input
                                        value={tab.defaultTitlePrefix}
                                        onChange={(event) => setState((prev) => ({
                                            ...prev,
                                            tabs: updateTab(prev.tabs, index, (current) => ({
                                                ...current,
                                                defaultTitlePrefix: event.target.value,
                                            })),
                                        }))}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-5">
                                <div className="space-y-2">
                                    <Label>Pill color</Label>
                                    <Select
                                        value={tab.sessionPillColor}
                                        onValueChange={(value) => setState((prev) => ({
                                            ...prev,
                                            tabs: updateTab(prev.tabs, index, (current) => ({
                                                ...current,
                                                sessionPillColor: value as PillColor,
                                            })),
                                        }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {PILL_COLOR_OPTIONS.map((pillColor) => (
                                                <SelectItem key={pillColor} value={pillColor}>
                                                    {pillColor}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {([
                                    AccessLevel.overview,
                                    AccessLevel.view,
                                    AccessLevel.signup,
                                    AccessLevel.admin,
                                ] as const).map((accessLevel) => (
                                    <div key={accessLevel} className="space-y-2">
                                        <Label>{accessLevel}</Label>
                                        <Select
                                            value={String(tab.permissions[accessLevel])}
                                            onValueChange={(value) => setState((prev) => ({
                                                ...prev,
                                                tabs: updateTab(prev.tabs, index, (current) => ({
                                                    ...current,
                                                    permissions: {
                                                        ...current.permissions,
                                                        [accessLevel]: Number(value) as Role,
                                                    },
                                                })),
                                            }))}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {ROLE_OPTIONS.map((roleOption) => (
                                                    <SelectItem
                                                        key={`${accessLevel}-${roleOption.value}`}
                                                        value={String(roleOption.value)}
                                                    >
                                                        {roleOption.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="rounded-lg border bg-card p-6 space-y-4">
                <h3 className="text-base font-semibold text-foreground">Admin Tabs</h3>
                <div className="space-y-3">
                    {state.adminTabs.map((tab, index) => (
                        <div key={`${tab.id}-${index}`} className="grid gap-3 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label>Tab id</Label>
                                <Input value={tab.id} disabled />
                            </div>
                            <div className="space-y-2">
                                <Label>Label</Label>
                                <Input
                                    value={tab.label}
                                    onChange={(event) => setState((prev) => ({
                                        ...prev,
                                        adminTabs: prev.adminTabs.map((currentTab, currentIndex) => (
                                            currentIndex === index
                                                ? { ...currentTab, label: event.target.value }
                                                : currentTab
                                        )),
                                    }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Icon name</Label>
                                <Input
                                    value={tab.iconName}
                                    onChange={(event) => setState((prev) => ({
                                        ...prev,
                                        adminTabs: prev.adminTabs.map((currentTab, currentIndex) => (
                                            currentIndex === index
                                                ? { ...currentTab, iconName: event.target.value }
                                                : currentTab
                                        )),
                                    }))}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    type="button"
                    variant="outline"
                    disabled={!isDirty}
                    onClick={() => setState(initialState)}
                >
                    Reset
                </Button>
                <Button type="button" disabled>
                    Save (next slice)
                </Button>
                <span className="text-xs text-muted-foreground">
                    {isDirty ? "Unsaved local changes" : "No local changes"}
                </span>
            </div>
        </section>
    );
}
