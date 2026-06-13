import type { ComponentType, Ref } from "react";
import type { SignupRow } from "@/components/sports/session/session-signups-table";

/** Props passed to every session view component (read-only viewer). */
export interface SessionViewProps {
  signups: SignupRow[];
  teamMemberIds: Set<string>;
  playerCap: number | null;
  currentUserId?: string | null;
  /** The stored data for this view. */
  viewData: unknown;
  /** Optional admin context — when present, views may render admin actions. */
  isAdmin?: boolean;
  sport?: string;
  sessionId?: string;
}

/**
 * Imperative handle exposed by every editor via useImperativeHandle.
 * The dialog calls getCurrentData() to pull the editor's state on save.
 */
export interface SessionViewEditorHandle {
  getCurrentData: () => unknown;
}

/**
 * Props passed to every session view editor component.
 * Editors own their state internally and expose it via the ref handle.
 * See fielding-view/index.ts for full documentation on implementing a new view.
 */
export interface SessionViewEditorProps {
  signups: SignupRow[];
  teamMemberIds: Set<string>;
  /** Initial data for this view (from the DB). Do not mutate — use as seed for local state. */
  viewData: unknown;
  /** Ref for the dialog to pull data imperatively via getCurrentData(). */
  ref?: Ref<SessionViewEditorHandle>;
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
