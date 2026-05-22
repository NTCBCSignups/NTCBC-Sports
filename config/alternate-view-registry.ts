import type { ComponentType } from "react";
import OrderedSignupsView from "@/components/sports/ordered-signups-view";
import BattingOrderEditor from "@/components/sports/batting-order-editor";
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
        ViewComponent: OrderedSignupsView,
        EditorComponent: BattingOrderEditor,
    },
};

export function getAlternateView(viewId: string): AlternateViewEntry | undefined {
    return alternateViewRegistry[viewId];
}
