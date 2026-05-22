import CustomOrderedView from "./custom-ordered-view";
import CustomOrderedEditor from "./custom-ordered-editor";
import { AltView } from "./interfaces";

/**
 * Registry of all available alternate view types.
 * Each entry is an AltView instance requiring exactly one View and one Editor.
 * Admins can create any of these for any session.
 */
const alternateViewRegistry: Record<string, AltView> = {
    customOrderedView: new AltView(
        "Custom Ordered View",
        CustomOrderedView,
        CustomOrderedEditor,
    ),
};

export function getAlternateView(viewId: string): AltView | undefined {
    return alternateViewRegistry[viewId];
}

/** Returns all registered view types (id + label) for admin UI. */
export function getAllAlternateViews(): { id: string; label: string }[] {
    return Object.entries(alternateViewRegistry).map(([id, entry]) => ({
        id,
        label: entry.label,
    }));
}
