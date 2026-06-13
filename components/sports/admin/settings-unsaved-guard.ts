export const SETTINGS_UNSAVED_WARNING_MESSAGE =
  "You have unsaved changes in Settings. Leave without saving?";

let settingsDirty = false;

export function hasUnsavedSettingsChanges(): boolean {
  return settingsDirty;
}

export function setUnsavedSettingsChanges(isDirty: boolean): void {
  settingsDirty = isDirty;
}

export function clearUnsavedSettingsChanges(): void {
  setUnsavedSettingsChanges(false);
}

export function confirmLeaveWithUnsavedSettings(): boolean {
  if (!hasUnsavedSettingsChanges()) {
    return true;
  }

  return window.confirm(SETTINGS_UNSAVED_WARNING_MESSAGE);
}
