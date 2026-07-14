"use client";

import { useEffect, useRef } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

interface ScrollablePillsProps {
  items: { id: string; label: string }[];
  value: string;
  onValueChange: (value: string) => void;
  /** Max width of the container. Defaults to "max-w-[240px]". */
  maxWidth?: string;
  className?: string;
}

/**
 * Fixed-width scrollable segmented control with pill buttons.
 * When items overflow the container, they scroll horizontally (swipeable on mobile).
 * The active pill auto-scrolls to center on selection.
 */
export function ScrollablePills({
  items,
  value,
  onValueChange,
  maxWidth = "max-w-[240px]",
  className,
}: ScrollablePillsProps) {
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll active pill to center within the container
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    requestAnimationFrame(() => {
      const active = list.querySelector<HTMLElement>(`[data-state="active"]`);
      if (!active) return;
      const listRect = list.getBoundingClientRect();
      const activeRect = active.getBoundingClientRect();
      const offset =
        list.scrollLeft +
        (activeRect.left - listRect.left) -
        list.offsetWidth / 2 +
        active.offsetWidth / 2;
      list.scrollTo({ left: offset, behavior: "smooth" });
    });
  }, [value]);

  return (
    <Tabs value={value} onValueChange={onValueChange} className={cn("gap-0", className)}>
      <TabsList
        ref={listRef}
        className={cn("justify-start overflow-x-auto scrollbar-hide flex-nowrap", maxWidth)}
      >
        {items.map((item) => (
          <TabsTrigger key={item.id} value={item.id} className="shrink-0">
            {item.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
