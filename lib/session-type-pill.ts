import { PillColor, type ResolvedSportConfig } from "@/config/config-resolver";

const SESSION_PILL_COLOR_CLASSES: Record<PillColor, string> = {
  [PillColor.gray]:
    "border-border bg-muted text-muted-foreground hover:bg-muted",
  [PillColor.emerald]:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  [PillColor.indigo]:
    "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  [PillColor.amber]:
    "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
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
