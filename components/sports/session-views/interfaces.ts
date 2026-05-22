import type { ComponentType } from "react";
import type { SignupRow } from "@/components/sports/session-signups-table";

/** Shape of each view instance stored in the session's views JSONB column. */
export interface StoredViewInstance {
    /** Registry key (e.g. "customOrderedView") — determines which component renders it. */
    type: string;
    /** Admin-given display name (e.g. "Batting Order"). */
    label: string;
    /** View-specific payload. */
    data: unknown;
    /** Whether this view is visible in the toggle. Defaults to true if omitted. */
    enabled?: boolean;
}

/** Props passed to every session view component. */
export interface SessionViewProps {
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId?: string | null;
    /** The stored data for this view. */
    viewData: unknown;
}

/** Props passed to every session view editor component. */
export interface SessionViewEditorProps {
    sport: string;
    sessionId: string;
    viewId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    /** Current saved data for this view. */
    viewData: unknown;
    onSaved: () => void;
}

/**
 * Defines a session view type. Each instance requires exactly
 * one View component and one Editor component.
 */
export class SessionView {
    constructor(
        public readonly label: string,
        public readonly ViewComponent: ComponentType<SessionViewProps>,
        public readonly EditorComponent: ComponentType<SessionViewEditorProps>,
    ) {}
}
