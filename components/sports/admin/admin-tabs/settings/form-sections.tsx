"use client";

import { type Dispatch, type SetStateAction } from "react";
import {
  CalendarDays,
  ChevronDown,
  MapPin,
  Pencil,
  Plus,
  Shield,
  Trash2,
  Users2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
import { AUTO_DEFAULT_ADMIN_TAB_VALUE, AUTO_DEFAULT_TAB_VALUE } from "./constants";
import { summarizePermissions } from "./helpers";
import type { DefaultAdminTabOption, DefaultTabOption, SportConfigFormState } from "./types";
import type { SportConfigFieldName } from "@/lib/actions/sport-config-validation";

/**
 * Settings section card — collapsible, closed by default (mobile-first).
 *
 * NNGroup "Accordions on Mobile" (Budiu, 2015):
 *   "Accordions are one of the most useful design elements on mobile, as they
 *    solve the problem of displaying too much content in too little screen space."
 *   "Section headings serve as a mini-IA of the page — helping users form a
 *    mental model of the information available."
 *
 * NNGroup "Accordions on Desktop" (Wang, 2023):
 *   "When users need only a few pieces of information on a single page, hiding
 *    most content helps users spend their time more efficiently."
 *
 * For admin settings: admins typically edit 1-2 sections per visit, not all 6.
 * Collapsed sections show the full structure at a glance (mini-IA) and users
 * expand only what they need — reducing cognitive load and page length on mobile.
 */
function SettingsCard({
  title,
  description,
  icon,
  children,
}: {
  title: string;
  description: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Collapsible asChild>
      <Card>
        <CollapsibleTrigger className="flex w-full items-center gap-3 text-left cursor-pointer group [&[data-state=closed]>div>svg.collapse-icon]:rotate-0">
          <CardHeader className="flex-1">
            <div className="flex items-center gap-2">
              {icon}
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <div className="pr-6 shrink-0">
            <ChevronDown className="collapse-icon h-4 w-4 text-muted-foreground transition-transform duration-200 rotate-180" />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent>{children}</CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/** Inline error message for a form field — Baymard: show below the field in destructive color */
function FieldError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="text-xs text-destructive mt-1" role="alert">
      {error}
    </p>
  );
}

/** Zod-validated error map. */
type FieldErrors = Partial<Record<SportConfigFieldName, string>>;

/** Positive validation indicator — Baymard: green tint on touched valid fields */
function validInputClass(
  field: SportConfigFieldName,
  errors: FieldErrors,
  touched: ReadonlySet<SportConfigFieldName>,
): string {
  if (!touched.has(field)) return "";
  return errors[field] ? "border-destructive/50" : "border-success/40";
}

interface GeneralSettingsSectionProps {
  state: SportConfigFormState;
  setState: Dispatch<SetStateAction<SportConfigFormState>>;
  fieldErrors: FieldErrors;
  touchedFields: ReadonlySet<SportConfigFieldName>;
  onBlur: (field: SportConfigFieldName) => void;
}

/**
 * General settings split into 3 focused cards following NNGroup research:
 * - Grouping related fields reduces perceived complexity (≤4 fields per card)
 * - Labels above fields improve scannability
 * - Always-visible live preview provides immediate feedback (Nielsen Heuristic #1)
 * - Card boundaries leverage Gestalt common-regions principle for stronger visual grouping
 */
export function GeneralSettingsSection({
  state,
  setState,
  fieldErrors,
  touchedFields,
  onBlur,
}: GeneralSettingsSectionProps) {
  return (
    <div className="space-y-4">
      {/* Sport Identity — with always-visible live preview */}
      <SettingsCard
        title="Sport Identity"
        description="Name, branding, and description for this sport."
      >
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Form fields */}
          <div className="flex-1 grid gap-4 sm:grid-cols-2 min-w-0">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={state.name}
                className={validInputClass("name", fieldErrors, touchedFields)}
                onChange={(event) => setState((prev) => ({ ...prev, name: event.target.value }))}
                onBlur={() => onBlur("name")}
              />
              <FieldError error={fieldErrors.name} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emoji">Emoji</Label>
              <Input
                id="emoji"
                value={state.emoji}
                className={validInputClass("emoji", fieldErrors, touchedFields)}
                onChange={(event) => setState((prev) => ({ ...prev, emoji: event.target.value }))}
                onBlur={() => onBlur("emoji")}
              />
              <FieldError error={fieldErrors.emoji} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Type</Label>
              <Input
                id="type"
                value={state.type}
                className={validInputClass("type", fieldErrors, touchedFields)}
                onChange={(event) => setState((prev) => ({ ...prev, type: event.target.value }))}
                onBlur={() => onBlur("type")}
              />
              <FieldError error={fieldErrors.type} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                rows={2}
                value={state.description}
                onChange={(event) =>
                  setState((prev) => ({ ...prev, description: event.target.value }))
                }
              />
            </div>
          </div>

          {/* Always-visible live preview — immediate feedback per Nielsen Heuristic #1 */}
          <div className="lg:w-64 shrink-0">
            <p className="text-xs text-muted-foreground mb-2">Preview</p>
            <div className="rounded-lg border border-dashed bg-muted/30 p-3">
              <Card className="overflow-hidden shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">
                    {state.emoji} {state.name || "Sport Name"}
                  </CardTitle>
                  <CardDescription className="text-xs">{state.type || "Type"}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground pt-0">
                  {state.day && (
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3 w-3" />
                      <span>{state.day}</span>
                    </div>
                  )}
                  {state.description && <p className="line-clamp-2">{state.description}</p>}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Location */}
      <SettingsCard
        title="Location"
        description="Where this sport takes place."
        icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          <div className="space-y-2">
            <Label htmlFor="locationName">Venue name</Label>
            <Input
              id="locationName"
              value={state.locationName}
              className={validInputClass("locationName", fieldErrors, touchedFields)}
              onChange={(event) =>
                setState((prev) => ({ ...prev, locationName: event.target.value }))
              }
              onBlur={() => onBlur("locationName")}
            />
            <FieldError error={fieldErrors.locationName} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="locationAddress">Address</Label>
            <Input
              id="locationAddress"
              value={state.locationAddress}
              onChange={(event) =>
                setState((prev) => ({ ...prev, locationAddress: event.target.value }))
              }
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="locationMapsLink">Maps link</Label>
            <Input
              id="locationMapsLink"
              type="url"
              value={state.locationMapsLink}
              className={validInputClass("locationMapsLink", fieldErrors, touchedFields)}
              onChange={(event) =>
                setState((prev) => ({ ...prev, locationMapsLink: event.target.value }))
              }
              onBlur={() => onBlur("locationMapsLink")}
              placeholder="https://maps.google.com/..."
            />
            <FieldError error={fieldErrors.locationMapsLink} />
          </div>
        </div>
      </SettingsCard>

      {/* Schedule & Contact */}
      <SettingsCard
        title="Schedule & Contact"
        description="When it happens and who to contact."
        icon={<Users2 className="h-4 w-4 text-muted-foreground" />}
      >
        <div className="grid gap-4 sm:grid-cols-2 min-w-0">
          <div className="space-y-2">
            <Label htmlFor="day">Schedule</Label>
            <Input
              id="day"
              value={state.day}
              className={validInputClass("day", fieldErrors, touchedFields)}
              onChange={(event) => setState((prev) => ({ ...prev, day: event.target.value }))}
              onBlur={() => onBlur("day")}
              placeholder="e.g. Wednesdays 7pm"
            />
            <FieldError error={fieldErrors.day} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="organizers">Organisers</Label>
            <Input
              id="organizers"
              value={state.organizers}
              className={validInputClass("organizers", fieldErrors, touchedFields)}
              onChange={(event) =>
                setState((prev) => ({ ...prev, organizers: event.target.value }))
              }
              onBlur={() => onBlur("organizers")}
            />
            <FieldError error={fieldErrors.organizers} />
          </div>
        </div>
      </SettingsCard>
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

/**
 * Session tabs section — always-visible Card layout with live preview.
 *
 * UX principles applied:
 * - Card boundary creates Gestalt common-regions grouping (NNGroup)
 * - Preview always visible — hidden previews defeat their purpose (Nielsen #1)
 * - 44px minimum touch targets on action buttons (Apple HIG / WCAG 2.5.5)
 * - Notes field grouped with default tab selector (related controls near each other)
 */
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
    <div className="space-y-4">
      {/* Notes & Defaults */}
      <SettingsCard
        title="Sports Page"
        description="Public-facing page content and session tab configuration."
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (one per line)</Label>
            <Textarea
              id="notes"
              rows={4}
              value={state.notesText}
              onChange={(event) => setState((prev) => ({ ...prev, notesText: event.target.value }))}
              placeholder="Add notes visible to players on the sport page..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="default-tab">Default session tab</Label>
            <Select
              value={defaultTabValue}
              onValueChange={(value) =>
                setState((prev) => ({
                  ...prev,
                  defaultTab: value === AUTO_DEFAULT_TAB_VALUE ? "" : value,
                }))
              }
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
        </div>
      </SettingsCard>

      {/* Session Tabs List */}
      <SettingsCard
        title="Session Tabs"
        description="Define the session types players can see and sign up for. Drag to reorder."
      >
        <div className="space-y-4">
          <DraggableList
            items={state.tabs}
            onReorder={(tabs) => setState((prev) => ({ ...prev, tabs }))}
            keyExtractor={(tab) => tab.key}
            itemClassName={() => "items-start flex-col gap-3 sm:flex-row sm:items-center"}
            renderItem={(tab, index) => {
              const isDefault = state.defaultTab ? tab.value === state.defaultTab : index === 0;

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
                      {isDefault && <Badge variant="secondary">Default</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Auto session title text: {tab.defaultTitlePrefix || "(uses tab name)"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Permissions: {summarizePermissions(tab.permissions)}
                    </p>
                  </div>

                  {/* Action buttons — min 44px touch target per Apple HIG / WCAG 2.5.5 */}
                  <div className="flex w-full items-center justify-end gap-1 shrink-0 sm:w-auto">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 min-w-10 p-0 sm:min-w-0 sm:w-auto sm:px-2"
                      onClick={() => openEditTabDialog(tab.key)}
                    >
                      <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Edit</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 min-w-10 p-0 sm:min-w-0 sm:w-auto sm:px-2"
                      onClick={() => openPermissionsDialog(tab.key)}
                    >
                      <Shield className="h-3.5 w-3.5 sm:mr-1" />
                      <span className="hidden sm:inline">Permissions</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-10 min-w-10 p-0 text-destructive hover:text-destructive"
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

          {/* Always-visible preview — NNGroup: hidden previews defeat their purpose */}
          {state.tabs.length > 0 && (
            <div className="rounded-lg border border-dashed bg-muted/30 p-4 space-y-4">
              <p className="text-xs font-medium text-muted-foreground">Live Preview</p>
              <SessionTabPills
                tabs={state.tabs.map((tab) => ({
                  value: tab.value || tab.key,
                  label: tab.label || "Untitled",
                }))}
                activeValue={state.defaultTab || state.tabs[0]?.value || ""}
                interactive={false}
              />

              {(() => {
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
                  facilitator_id: null,
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
                    <SessionCard session={mockSession} tab={mockTab} />
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </SettingsCard>
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
    <SettingsCard
      title="Admin Page"
      description="Choose which admin tabs appear in the sidebar, then drag to reorder them."
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="default-admin-tab">Default admin tab</Label>
          <Select
            value={defaultAdminTabValue}
            onValueChange={(value) =>
              setState((prev) => ({
                ...prev,
                defaultAdminTab: value === AUTO_DEFAULT_ADMIN_TAB_VALUE ? "" : value,
              }))
            }
          >
            <SelectTrigger id="default-admin-tab">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={AUTO_DEFAULT_ADMIN_TAB_VALUE}>Auto (Settings)</SelectItem>
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

        <div className="flex items-center gap-2 rounded-md border border-dashed bg-muted/30 px-3 py-2.5">
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

                {/* Action buttons — min 44px touch target per Apple HIG / WCAG 2.5.5 */}
                <div className="flex w-full items-center justify-end gap-1 shrink-0 sm:w-auto">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-w-10 p-0 sm:min-w-0 sm:w-auto sm:px-2"
                    onClick={() => openEditAdminTabDialog(tab.key)}
                  >
                    <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Edit</span>
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-10 min-w-10 p-0 text-destructive hover:text-destructive"
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
    </SettingsCard>
  );
}
