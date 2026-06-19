"use client";

import type { Dispatch, SetStateAction } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { PillColor, Role } from "@/config/config-resolver";
import { SESSION_TAB_RULES } from "@/config/session-tab-rules";
import { sessionPillClassFromColor } from "@/lib/session-type-pill";
import { cn } from "@/lib/utils";
import { getAdminTabDefinition, type AdminTabDefinition } from "./admin-tab-ui-metadata";
import { ACCESS_LEVEL_OPTIONS, PILL_COLOR_OPTIONS, ROLE_OPTIONS } from "./constants";
import { toTabSlug } from "./helpers";
import type {
  AdminTabDialogMode,
  AdminTabDraft,
  EditableTab,
  EditableTabPermissions,
  PendingDeleteTarget,
  TabDialogMode,
} from "./types";

interface SessionTabDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  tabDialogMode: TabDialogMode;
  tabDraft: EditableTab;
  setTabDraft: Dispatch<SetStateAction<EditableTab>>;
  saveTabDraft: () => void;
}

export function SessionTabDialog({
  open,
  setOpen,
  tabDialogMode,
  tabDraft,
  setTabDraft,
  saveTabDraft,
}: SessionTabDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {tabDialogMode === "add" ? "Add Session Tab" : "Edit Session Tab"}
          </DialogTitle>
          <DialogDescription className="sr-only">Manage session tab details.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 min-w-0 [&>*]:min-w-0">
            <div className="space-y-2">
              <Label htmlFor="tab-label">Session Type Name</Label>
              <Input
                id="tab-label"
                value={tabDraft.label}
                onChange={(event) =>
                  setTabDraft((prev) => ({
                    ...prev,
                    label: event.target.value,
                  }))
                }
                placeholder="e.g. Open Gym"
              />
              <p className="text-xs text-muted-foreground">
                Players see this as the tab name on the sport page. eg. {'"'}
                Practices{'"'}
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
                    onClick={() =>
                      setTabDraft((prev) => ({
                        ...prev,
                        value: toTabSlug(prev.label),
                      }))
                    }
                  >
                    Generate from label
                  </Button>
                )}
              </div>
              <Input
                id="tab-value"
                value={tabDraft.value}
                disabled={SESSION_TAB_RULES.valueImmutableAfterCreate && tabDialogMode === "edit"}
                onChange={(event) =>
                  setTabDraft((prev) => ({
                    ...prev,
                    value: event.target.value,
                  }))
                }
                placeholder="e.g. open-gym"
              />
              {SESSION_TAB_RULES.valueImmutableAfterCreate && tabDialogMode === "edit" && (
                <p className="text-xs text-muted-foreground">Tab value is fixed after creation.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="tab-title-prefix">Text used in auto session titles</Label>
              <Input
                id="tab-title-prefix"
                value={tabDraft.defaultTitlePrefix}
                onChange={(event) =>
                  setTabDraft((prev) => ({
                    ...prev,
                    defaultTitlePrefix: event.target.value,
                  }))
                }
                placeholder="Leave blank to use tab text"
              />
              <p className="text-xs text-muted-foreground">
                Used when a session title is empty (eg, {'"'}Practice{'"'} for {'"'}
                Practice: Jan 5{'"'}).
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="tab-pill-color">Session pill color</Label>
              <Select
                value={tabDraft.sessionPillColor}
                onValueChange={(value) =>
                  setTabDraft((prev) => ({
                    ...prev,
                    sessionPillColor: value as PillColor,
                  }))
                }
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
                    onValueChange={(value) =>
                      setTabDraft((prev) => ({
                        ...prev,
                        signupConfirmationDialog: prev.signupConfirmationDialog
                          ? {
                              ...prev.signupConfirmationDialog,
                              maxRole: Number(value) as Role,
                            }
                          : undefined,
                      }))
                    }
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
                    onChange={(event) =>
                      setTabDraft((prev) => ({
                        ...prev,
                        signupConfirmationDialog: prev.signupConfirmationDialog
                          ? {
                              ...prev.signupConfirmationDialog,
                              message: event.target.value,
                            }
                          : undefined,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tab-signup-rejected-message">Rejected message</Label>
                  <Textarea
                    id="tab-signup-rejected-message"
                    rows={2}
                    value={tabDraft.signupConfirmationDialog.rejectedMessage}
                    onChange={(event) =>
                      setTabDraft((prev) => ({
                        ...prev,
                        signupConfirmationDialog: prev.signupConfirmationDialog
                          ? {
                              ...prev.signupConfirmationDialog,
                              rejectedMessage: event.target.value,
                            }
                          : undefined,
                      }))
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveTabDraft}>
            {tabDialogMode === "add" ? "Add tab" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface PermissionsDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  editingTabLabel?: string;
  permissionsDraft: EditableTabPermissions;
  setPermissionsDraft: Dispatch<SetStateAction<EditableTabPermissions>>;
  savePermissionsDraft: () => void;
}

export function PermissionsDialog({
  open,
  setOpen,
  editingTabLabel,
  permissionsDraft,
  setPermissionsDraft,
  savePermissionsDraft,
}: PermissionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tab Permissions{editingTabLabel ? `: ${editingTabLabel}` : ""}</DialogTitle>
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
                onValueChange={(value) =>
                  setPermissionsDraft((prev) => ({
                    ...prev,
                    [accessLevel.value]: Number(value) as Role,
                  }))
                }
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={savePermissionsDraft}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface AdminTabDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  mode: AdminTabDialogMode;
  adminTabDraft: AdminTabDraft;
  setAdminTabDraft: Dispatch<SetStateAction<AdminTabDraft>>;
  addableAdminTabDefinitions: AdminTabDefinition[];
  adminIconOptions: Array<{ value: string; label: string }>;
  saveAdminTabDraft: () => void;
}

export function AdminTabDialog({
  open,
  setOpen,
  mode,
  adminTabDraft,
  setAdminTabDraft,
  addableAdminTabDefinitions,
  adminIconOptions,
  saveAdminTabDraft,
}: AdminTabDialogProps) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add Admin Tab" : "Edit Admin Tab"}</DialogTitle>
          <DialogDescription className="sr-only">
            Manage admin sidebar tab metadata.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {mode === "add" ? (
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
                {getAdminTabDefinition(adminTabDraft.id)?.description ??
                  "Choose an available admin page."}
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
              onChange={(event) =>
                setAdminTabDraft((prev) => ({
                  ...prev,
                  label: event.target.value,
                }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="admin-tab-icon">Icon</Label>
            <Select
              value={adminTabDraft.iconName}
              onValueChange={(value) =>
                setAdminTabDraft((prev) => ({
                  ...prev,
                  iconName: value,
                }))
              }
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
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={saveAdminTabDraft}>
            {mode === "add" ? "Add admin tab" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DeleteTargetDialogProps {
  pendingDeleteTarget: PendingDeleteTarget | null;
  setPendingDeleteTarget: Dispatch<SetStateAction<PendingDeleteTarget | null>>;
  confirmDeleteTarget: () => void;
}

export function DeleteTargetDialog({
  pendingDeleteTarget,
  setPendingDeleteTarget,
  confirmDeleteTarget,
}: DeleteTargetDialogProps) {
  return (
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
  );
}
