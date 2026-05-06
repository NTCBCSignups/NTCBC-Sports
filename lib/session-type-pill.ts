/** Matches `SessionTab.value` in sports-config (and DB `session_type`). */
const SESSION_TYPE_PILL_CLASSES: Record<string, string> = {
  drop_in_practice:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50",
  scheduled_game:
    "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50",
  umpiring:
    "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50",
};

export function sessionTypePillClass(sessionType: string): string {
  return (
    SESSION_TYPE_PILL_CLASSES[sessionType] ??
    "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-100"
  );
}
