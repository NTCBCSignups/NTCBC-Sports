import CustomOrderedView, { CustomOrderedEditor } from "./custom-ordered-view";
import AttendanceView, { AttendanceEditor } from "./attendance-view";
import { DevotionalView, DevotionalEditor } from "./devotional-view";
import { SessionView } from "./interfaces";
import { Role } from "@/config/config-resolver";

// ── Sport-specific imports (ESLint-exempt: this file is the registration point) ──
import SoftballFieldingView, {
  SoftballFieldingEditor,
} from "@/components/softball/session-views/fielding-view";

/**
 * Registry of all available session view types.
 * Each entry is a SessionView instance requiring exactly one View and one Editor.
 * Admins can create any of these for any session.
 *
 * To add a new sport-specific view:
 * 1. Create the view component in `components/<sport>/session-views/`
 * 2. Import and register it below under "Sport-specific views"
 */
const sessionViewRegistry: Record<string, SessionView> = {
  // ── Core views ──
  attendanceView: new SessionView("Attendance", AttendanceView, AttendanceEditor, "Attendance"),
  customOrderedView: new SessionView(
    "Custom Ordered View",
    CustomOrderedView,
    CustomOrderedEditor,
    "Lineup",
  ),
  devotionalView: new SessionView(
    "Devotional",
    DevotionalView,
    DevotionalEditor,
    "Devotional",
    Role.anon,
  ),
  // ── Sport-specific views ──
  softballFieldingView: new SessionView(
    "CCSA Softball - Fielding View",
    SoftballFieldingView,
    SoftballFieldingEditor,
    "Fielding",
  ),
};

/** The registry key for the built-in default view. */
export const DEFAULT_VIEW_TYPE = "attendanceView";

export function getSessionView(viewId: string): SessionView | undefined {
  return sessionViewRegistry[viewId];
}

/** Returns all registered view types (id + label + defaultName) for admin UI. */
export function getAllSessionViews(): { id: string; label: string; defaultName: string }[] {
  return Object.entries(sessionViewRegistry).map(([id, entry]) => ({
    id,
    label: entry.label,
    defaultName: entry.defaultName,
  }));
}
