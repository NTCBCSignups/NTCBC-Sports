"use client";

import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from "react";
import { toast } from "sonner";
import { Configurator, useConfigurator, RestoreBanner } from "@/components/ui/configurator";
import {
  isAdminTabIconName,
  SETTINGS_TAB_ID,
  SETTINGS_TAB_LABEL,
} from "@/config/admin-tab-metadata";
import { SESSION_TAB_RULES } from "@/config/session-tab-rules";
import { updateSportConfig, type UpdateSportConfigInput } from "@/lib/actions/sport-config";
import { toastClasses } from "@/lib/styles";
import { AUTO_DEFAULT_ADMIN_TAB_VALUE, AUTO_DEFAULT_TAB_VALUE } from "./constants";
import { ADMIN_TAB_DEFINITIONS, ADMIN_TAB_ICON_OPTIONS } from "./admin-tab-ui-metadata";
import { AdminTabDialog, DeleteTargetDialog, PermissionsDialog, SessionTabDialog } from "./dialogs";
import { AdminTabsSection, GeneralSettingsSection, SessionTabsSection } from "./form-sections";
import { FormActionsRow } from "@/components/sports/admin/form-actions-row";
import {
  buildInitialState,
  createAdminTabDraft,
  createBlankTabDraft,
  createDefaultPermissions,
  createKey,
  updateTabByKey,
} from "./helpers";
import type {
  AdminTabDialogMode,
  AdminTabDraft,
  DefaultAdminTabOption,
  DefaultTabOption,
  EditableTab,
  EditableTabPermissions,
  PendingDeleteTarget,
  SportConfigFormProps,
  SportConfigFormState,
  TabDialogMode,
} from "./types";

export default function SportConfigForm({ sport, initialConfig }: SportConfigFormProps) {
  const initialState = useMemo(
    () => buildInitialState(sport, initialConfig),
    [sport, initialConfig],
  );

  return (
    <Configurator draftKey={`settings:${sport}`} serverState={initialState}>
      <SportConfigFormInner sport={sport} />
    </Configurator>
  );
}

function SportConfigFormInner({ sport }: { sport: string }) {
  const {
    draft: state,
    setDraft,
    updateDraft,
    isDirty,
    save,
    discard,
  } = useConfigurator<SportConfigFormState>();
  const setState: Dispatch<SetStateAction<SportConfigFormState>> = useCallback(
    (action) => {
      if (typeof action === "function") {
        updateDraft(action);
      } else {
        setDraft(action);
      }
    },
    [updateDraft, setDraft],
  );
  const [isPending, startTransition] = useTransition();

  const [tabDialogOpen, setTabDialogOpen] = useState(false);
  const [tabDialogMode, setTabDialogMode] = useState<TabDialogMode>("add");
  const [editingTabKey, setEditingTabKey] = useState<string | null>(null);
  const [tabDraft, setTabDraft] = useState<EditableTab>(() => createBlankTabDraft());

  const [permissionsDialogOpen, setPermissionsDialogOpen] = useState(false);
  const [permissionsTabKey, setPermissionsTabKey] = useState<string | null>(null);
  const [permissionsDraft, setPermissionsDraft] = useState<EditableTabPermissions>(() =>
    createDefaultPermissions(),
  );

  const [adminTabDialogOpen, setAdminTabDialogOpen] = useState(false);
  const [adminTabDialogMode, setAdminTabDialogMode] = useState<AdminTabDialogMode>("add");
  const [editingAdminTabKey, setEditingAdminTabKey] = useState<string | null>(null);
  const [adminTabDraft, setAdminTabDraft] = useState<AdminTabDraft>(() => createAdminTabDraft());
  const [pendingDeleteTarget, setPendingDeleteTarget] = useState<PendingDeleteTarget | null>(null);

  const addableAdminTabDefinitions = useMemo(() => {
    const selected = new Set(state.adminTabs.map((tab) => tab.id));
    return ADMIN_TAB_DEFINITIONS.filter(
      (definition) => definition.id !== SETTINGS_TAB_ID && !selected.has(definition.id),
    );
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

  const defaultTabOptions: DefaultTabOption[] = state.tabs
    .map((tab) => ({
      key: tab.key,
      label: tab.label,
      value: tab.value.trim(),
    }))
    .filter((tab) => tab.value.length > 0);

  const defaultTabValue = defaultTabOptions.some((tab) => tab.value === state.defaultTab)
    ? state.defaultTab
    : AUTO_DEFAULT_TAB_VALUE;

  const defaultAdminTabOptions: DefaultAdminTabOption[] = (() => {
    const options = [
      { value: SETTINGS_TAB_ID, label: SETTINGS_TAB_LABEL },
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

  const defaultAdminTabValue = defaultAdminTabOptions.some(
    (tab) => tab.value === state.defaultAdminTab,
  )
    ? state.defaultAdminTab
    : AUTO_DEFAULT_ADMIN_TAB_VALUE;

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
      trimmedTabs.some(
        (tab) =>
          tab.signupConfirmationDialog &&
          (tab.signupConfirmationDialog.message.length === 0 ||
            tab.signupConfirmationDialog.rejectedMessage.length === 0),
      )
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
    const normalizedDefaultAdminTab =
      defaultAdminTab.length > 0 && validDefaultAdminTabs.has(defaultAdminTab)
        ? defaultAdminTab
        : "";

    const notes = state.notesText
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    const payload: UpdateSportConfigInput = {
      id: state.id,
      authEnabled: true,
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
        save();
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
    const nextValue = lockTabValue ? (previousTab?.value.trim() ?? "") : tabDraft.value.trim();
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

    const duplicate = state.tabs.some(
      (tab) =>
        tab.key !== editingTabKey && tab.value.trim().toLowerCase() === nextValue.toLowerCase(),
    );
    if (duplicate) {
      toast.error("That tab value is already in use.", { className: toastClasses.red });
      return;
    }

    if (
      nextSignupDialog &&
      (nextSignupDialog.message.length === 0 || nextSignupDialog.rejectedMessage.length === 0)
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

      const existingTab = prev.tabs.find((tab) => tab.key === editingTabKey);
      if (!existingTab) {
        return prev;
      }

      return {
        ...prev,
        tabs: updateTabByKey(prev.tabs, editingTabKey, () => normalized),
        defaultTab: prev.defaultTab === existingTab.value ? nextValue : prev.defaultTab,
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
        defaultTab:
          prev.defaultTab === removedTab.value ? (nextTabs[0]?.value ?? "") : prev.defaultTab,
      };
    });
  };

  const openAddAdminTabDialog = () => {
    if (addableAdminTabDefinitions.length === 0) {
      toast.message("All available admin tabs are already added.");
      return;
    }

    const firstDefinition = addableAdminTabDefinitions[0]!;
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

    const duplicate = state.adminTabs.some(
      (tab) => tab.key !== editingAdminTabKey && tab.id === nextId,
    );
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
              key: createKey("admin-tab", nextId),
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
        adminTabs: prev.adminTabs.map((tab) =>
          tab.key === editingAdminTabKey
            ? {
                ...tab,
                label: nextLabel,
                iconName: nextIconName,
              }
            : tab,
        ),
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
        defaultAdminTab:
          removedTab && prev.defaultAdminTab === removedTab.id ? "" : prev.defaultAdminTab,
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

  const handleReset = () => {
    discard();
    setTabDialogOpen(false);
    setPermissionsDialogOpen(false);
    setAdminTabDialogOpen(false);
    setPendingDeleteTarget(null);
  };

  return (
    <section className="space-y-4">
      <RestoreBanner />

      <GeneralSettingsSection state={state} setState={setState} />

      <SessionTabsSection
        state={state}
        setState={setState}
        defaultTabValue={defaultTabValue}
        defaultTabOptions={defaultTabOptions}
        openEditTabDialog={openEditTabDialog}
        openPermissionsDialog={openPermissionsDialog}
        requestDeleteTab={requestDeleteTab}
        openAddTabDialog={openAddTabDialog}
      />

      <AdminTabsSection
        state={state}
        setState={setState}
        defaultAdminTabValue={defaultAdminTabValue}
        defaultAdminTabOptions={defaultAdminTabOptions}
        openEditAdminTabDialog={openEditAdminTabDialog}
        requestDeleteAdminTab={requestDeleteAdminTab}
        openAddAdminTabDialog={openAddAdminTabDialog}
      />

      <FormActionsRow
        isDirty={isDirty}
        isPending={isPending}
        onReset={handleReset}
        onSave={handleSave}
      />

      <SessionTabDialog
        open={tabDialogOpen}
        setOpen={setTabDialogOpen}
        tabDialogMode={tabDialogMode}
        tabDraft={tabDraft}
        setTabDraft={setTabDraft}
        saveTabDraft={saveTabDraft}
      />

      <PermissionsDialog
        open={permissionsDialogOpen}
        setOpen={setPermissionsDialogOpen}
        editingTabLabel={permissionEditingTab?.label}
        permissionsDraft={permissionsDraft}
        setPermissionsDraft={setPermissionsDraft}
        savePermissionsDraft={savePermissionsDraft}
      />

      <AdminTabDialog
        open={adminTabDialogOpen}
        setOpen={setAdminTabDialogOpen}
        mode={adminTabDialogMode}
        adminTabDraft={adminTabDraft}
        setAdminTabDraft={setAdminTabDraft}
        addableAdminTabDefinitions={addableAdminTabDefinitions}
        adminIconOptions={adminIconOptions}
        saveAdminTabDraft={saveAdminTabDraft}
      />

      <DeleteTargetDialog
        pendingDeleteTarget={pendingDeleteTarget}
        setPendingDeleteTarget={setPendingDeleteTarget}
        confirmDeleteTarget={confirmDeleteTarget}
      />
    </section>
  );
}
