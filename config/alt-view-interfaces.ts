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
