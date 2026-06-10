export const SETTINGS_UNSAVED_WARNING_MESSAGE = "You have unsaved changes in Settings. Leave without saving?";

declare global {
    interface Window {
        SETTINGS_DIRTY?: boolean;
    }
}

export function hasUnsavedSettingsChanges(): boolean {
    return typeof window !== "undefined" && window.SETTINGS_DIRTY === true;
}

export function setUnsavedSettingsChanges(isDirty: boolean): void {
    if (typeof window === "undefined") {
        return;
    }

    window.SETTINGS_DIRTY = isDirty;
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
