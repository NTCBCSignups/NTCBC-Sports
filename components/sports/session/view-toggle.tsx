"use client";

import { ScrollablePills } from "@/components/ui/scrollable-pills";

interface ViewToggleProps {
  views: { id: string; label: string }[];
  activeView: string | null;
  onViewChange: (viewId: string | null) => void;
}

/**
 * Scrollable segmented control for switching between session views.
 * Only rendered when there are 2+ views.
 */
export default function ViewToggle({ views, activeView, onViewChange }: ViewToggleProps) {
  if (views.length < 2) return null;

  const resolvedValue = activeView ?? views[0]!.id;

  return <ScrollablePills items={views} value={resolvedValue} onValueChange={onViewChange} />;
}
