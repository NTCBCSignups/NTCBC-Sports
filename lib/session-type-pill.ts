import { PillColor, type ResolvedSportConfig } from "@/config/config-resolver";

const SESSION_PILL_COLOR_CLASSES: Record<PillColor, string> = {
  [PillColor.gray]:
    "border-gray-200 bg-gray-100 text-gray-700 hover:bg-gray-100",
  [PillColor.emerald]:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50",
  [PillColor.indigo]:
    "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50",
  [PillColor.amber]:
    "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50",
};

export function sessionTypePillClass(
  config: ResolvedSportConfig,
  sessionType: string,
): string {
  const color =
    config.tabs.find((tab) => tab.value === sessionType)?.sessionPillColor ??
    PillColor.gray;

  return SESSION_PILL_COLOR_CLASSES[color];
}
