import type { SignupRow } from "@/components/sports/session-signups-table";

/** Shape of each view instance stored in alt_session_views JSONB column. */
export interface StoredViewInstance {
    /** Registry key (e.g. "customOrderedView") — determines which component renders it. */
    type: string;
    /** Admin-given display name (e.g. "Batting Order"). */
    label: string;
    /** View-specific payload. */
    data: unknown;
}

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
