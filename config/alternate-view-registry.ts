import type { ComponentType } from "react";
import CustomOrderedView from "@/components/sports/session-alt-views/custom-ordered-view";
import CustomOrderedEditor from "@/components/sports/session-alt-views/custom-ordered-editor";
import type { AlternateViewProps, AlternateViewEditorProps } from "./alt-view-interfaces";

interface AlternateViewEntry {
    ViewComponent: ComponentType<AlternateViewProps>;
    EditorComponent: ComponentType<AlternateViewEditorProps>;
}

/**
 * Registry mapping alternate view IDs to their view and editor components.
 * Same pattern as admin-tab-registry — generic code never imports sport-specific folders.
 */
const alternateViewRegistry: Record<string, AlternateViewEntry> = {
    customOrderedView: {
        ViewComponent: CustomOrderedView,
        EditorComponent: CustomOrderedEditor,
    },
};

export function getAlternateView(viewId: string): AlternateViewEntry | undefined {
    return alternateViewRegistry[viewId];
}
