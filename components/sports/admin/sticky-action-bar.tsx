import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface StickyActionBarProps {
  visible: boolean;
  children: ReactNode;
  className?: string;
}

/**
 * A sticky bottom bar that hovers above content when visible.
 * Used for bulk actions, unsaved form changes, etc.
 * Includes a spacer to prevent content from being hidden underneath.
 */
export function StickyActionBar({ visible, children, className }: StickyActionBarProps) {
  if (!visible) return null;

  return (
    <>
      <div className="h-16" aria-hidden />
      <div
        className={cn(
          "sticky bottom-4 z-40 mx-1 rounded-xl border bg-background/95 backdrop-blur-sm px-4 py-3 shadow-lg",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}
