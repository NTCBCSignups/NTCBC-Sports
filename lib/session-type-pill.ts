import { PillColor, type ResolvedSportConfig } from "@/config/config-resolver";

const SESSION_PILL_COLOR_CLASSES: Record<PillColor, string> = {
  [PillColor.gray]: "border-border bg-muted text-muted-foreground hover:bg-muted",
  [PillColor.emerald]:
    "border-emerald-200 bg-emerald-50 text-emerald-900 hover:bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  [PillColor.indigo]:
    "border-indigo-200 bg-indigo-50 text-indigo-900 hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  [PillColor.amber]:
    "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-50 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200",
  [PillColor.blue]:
    "border-blue-200 bg-blue-50 text-blue-900 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200",
  [PillColor.rose]:
    "border-rose-200 bg-rose-50 text-rose-900 hover:bg-rose-50 dark:border-rose-800 dark:bg-rose-950 dark:text-rose-200",
  [PillColor.teal]:
    "border-teal-200 bg-teal-50 text-teal-900 hover:bg-teal-50 dark:border-teal-800 dark:bg-teal-950 dark:text-teal-200",
  [PillColor.violet]:
    "border-violet-200 bg-violet-50 text-violet-900 hover:bg-violet-50 dark:border-violet-800 dark:bg-violet-950 dark:text-violet-200",
};

export function sessionPillClassFromColor(color: PillColor): string {
  return SESSION_PILL_COLOR_CLASSES[color];
}

export function sessionTypePillClass(config: ResolvedSportConfig, sessionType: string): string {
  const color =
    config.tabs.find((tab) => tab.value === sessionType)?.sessionPillColor ?? PillColor.gray;

  return sessionPillClassFromColor(color);
}
