"use client";

import { cn } from "@/lib/utils";

interface TabPill {
  value: string;
  label: string;
}

interface SessionTabPillsProps {
  tabs: TabPill[];
  activeValue: string;
  onSelect?: (value: string) => void;
  interactive?: boolean;
}

export default function SessionTabPills({
  tabs,
  activeValue,
  onSelect,
  interactive = true,
}: SessionTabPillsProps) {
  return (
    <div
      role={interactive ? "tablist" : undefined}
      aria-label={interactive ? "Session filter" : undefined}
      className="flex gap-3 overflow-x-auto pb-1 sm:flex-wrap"
    >
      {tabs.map((tab) => {
        const selected = tab.value === activeValue;

        if (!interactive) {
          return (
            <span
              key={tab.value}
              className={cn(
                "rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap",
                selected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted text-foreground",
              )}
            >
              {tab.label}
            </span>
          );
        }

        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onSelect?.(tab.value)}
            className={cn(
              "rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              selected
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-foreground hover:bg-accent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
