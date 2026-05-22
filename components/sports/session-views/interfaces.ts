import type { ComponentType } from "react";
import type { SignupRow } from "@/components/sports/session-signups-table";

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
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    /** Current saved data for this view. */
    viewData: unknown;
    /** Called when the editor's data changes. Parent batches the save. */
    onChange: (data: unknown) => void;
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
