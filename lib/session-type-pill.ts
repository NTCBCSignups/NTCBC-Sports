import type { SessionPillColor, SportConfig } from "@/config/sports-config";

const DEFAULT_SESSION_PILL_COLOR: SessionPillColor = "gray";

const SESSION_PILL_COLOR_CLASSES: Record<SessionPillColor, string> = {
  gray: "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-100",
  emerald:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50",
  indigo:
    "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50",
  amber:
    "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50",
};

export function sessionTypePillClass(
  config: SportConfig | undefined,
  sessionType: string,
): string {
  const color =
    config?.tabs?.find((tab) => tab.value === sessionType)?.sessionPillColor ??
    DEFAULT_SESSION_PILL_COLOR;

  return SESSION_PILL_COLOR_CLASSES[color];
}
