import type { ComponentType } from "react";
import CustomOrderedView from "./custom-ordered-view";
import CustomOrderedEditor from "./custom-ordered-editor";
import type { AlternateViewProps, AlternateViewEditorProps } from "./interfaces";

export interface AlternateViewEntry {
    label: string;
    ViewComponent: ComponentType<AlternateViewProps>;
    EditorComponent: ComponentType<AlternateViewEditorProps>;
}

/**
 * Registry of all available alternate view types.
 * Admins can create any of these for any session. Users see the toggle
 * only for views that have saved data in alt_session_views.
 */
const alternateViewRegistry: Record<string, AlternateViewEntry> = {
    customOrderedView: {
        label: "Custom Ordered View",
        ViewComponent: CustomOrderedView,
        EditorComponent: CustomOrderedEditor,
    },
};

export function getAlternateView(viewId: string): AlternateViewEntry | undefined {
    return alternateViewRegistry[viewId];
}

/** Returns all registered view types (id + label) for admin UI. */
export function getAllAlternateViews(): { id: string; label: string }[] {
    return Object.entries(alternateViewRegistry).map(([id, entry]) => ({
        id,
        label: entry.label,
    }));
}
