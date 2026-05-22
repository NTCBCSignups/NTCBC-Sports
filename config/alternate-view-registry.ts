import type { ComponentType } from "react";
import CustomOrderedView from "@/components/sports/session-alt-views/custom-ordered-view";
import CustomOrderedEditor from "@/components/sports/session-alt-views/custom-ordered-editor";
import type { SignupRow } from "@/components/sports/session-signups-table";

/** Props passed to every alternate view component. */
export interface AlternateViewProps {
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId?: string | null;
    /** The stored data for this view (from alt_session_views[viewId]). */
    viewData: unknown;
}

/** Props passed to every alternate view editor component. */
export interface AlternateViewEditorProps {
    sport: string;
    sessionId: string;
    viewId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    /** Current saved data for this view. */
    viewData: unknown;
    onSaved: () => void;
}

interface AlternateViewEntry {
    ViewComponent: ComponentType<AlternateViewProps>;
    EditorComponent: ComponentType<AlternateViewEditorProps>;
}

/**
 * Registry mapping alternate view IDs to their view and editor components.
 * Same pattern as admin-tab-registry — generic code never imports sport-specific folders.
 */
const alternateViewRegistry: Record<string, AlternateViewEntry> = {
    battingOrder: {
        ViewComponent: CustomOrderedView,
        EditorComponent: CustomOrderedEditor,
    },
};

export function getAlternateView(viewId: string): AlternateViewEntry | undefined {
    return alternateViewRegistry[viewId];
}
