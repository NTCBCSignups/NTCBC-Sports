"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ViewToggleProps {
  views: { id: string; label: string }[];
  activeView: string | null;
  onViewChange: (viewId: string | null) => void;
}

/**
 * Lets users switch between configured session views.
 * Only rendered when there are 2+ views.
 */
export default function ViewToggle({ views, activeView, onViewChange }: ViewToggleProps) {
  if (views.length < 2) return null;

  return (
    <Select value={activeView ?? views[0]!.id} onValueChange={(v) => onViewChange(v)}>
      <SelectTrigger
        size="sm"
        className="text-sm w-auto text-foreground font-semibold underline underline-offset-4"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {views.map((view) => (
          <SelectItem key={view.id} value={view.id}>
            {view.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
