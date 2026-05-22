import CustomOrderedView, { CustomOrderedEditor } from "./custom-ordered-view";
import { SessionView } from "./interfaces";

/**
 * Registry of all available session view types.
 * Each entry is a SessionView instance requiring exactly one View and one Editor.
 * Admins can create any of these for any session.
 */
const sessionViewRegistry: Record<string, SessionView> = {
    customOrderedView: new SessionView(
        "Custom Ordered View",
        CustomOrderedView,
        CustomOrderedEditor,
    ),
};

export function getSessionView(viewId: string): SessionView | undefined {
    return sessionViewRegistry[viewId];
}

/** Returns all registered view types (id + label) for admin UI. */
export function getAllSessionViews(): { id: string; label: string }[] {
    return Object.entries(sessionViewRegistry).map(([id, entry]) => ({
        id,
        label: entry.label,
    }));
}
