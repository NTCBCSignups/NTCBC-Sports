"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { SessionViewProps } from "../interfaces";
import type { DevotionalViewData, DevotionalSection, DevotionalItem } from "./types";
import { getSectionTitle, getSectionEmoji } from "./types";

/**
 * Renders inline bold markers: **text** → <strong>text</strong>
 * Returns an array of React nodes for safe rendering.
 */
function renderBoldText(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

/** Indent padding classes by level (relative to list container). */
const INDENT_CLASSES = ["ml-0", "ml-0", "ml-5", "ml-10", "ml-14"] as const;

/** Bullet style by indent level. */
const BULLET_STYLE = [
  "list-disc",
  "list-disc",
  "list-[circle]",
  "list-[square]",
  "list-[square]",
] as const;

function DevotionalItemRow({
  item,
  showFacilitatorIndicator,
}: {
  item: DevotionalItem;
  showFacilitatorIndicator: boolean;
}) {
  const isFacilitatorOnly = showFacilitatorIndicator && item.facilitatorOnly;

  // Indent 0 = plain paragraph (no bullet)
  if (item.indent === 0) {
    return (
      <div
        className={cn(
          "text-sm leading-relaxed text-foreground",
          isFacilitatorOnly && "border-l-2 border-dashed border-primary/40 pl-2",
        )}
      >
        {renderBoldText(item.content)}
      </div>
    );
  }

  // Indent 1+ = list item with native bullet
  // Wrap in a div that carries the facilitator border (before the bullet)
  return (
    <div className={cn(isFacilitatorOnly && "border-l-2 border-dashed border-primary/40")}>
      <ul className={cn("list-outside pl-5", INDENT_CLASSES[item.indent] ?? "ml-14")}>
        <li className={cn(BULLET_STYLE[item.indent] ?? "list-[square]")}>
          <span className="text-sm leading-relaxed text-foreground">
            {renderBoldText(item.content)}
          </span>
        </li>
      </ul>
    </div>
  );
}

function DevotionalSectionView({
  section,
  isFacilitatorView,
}: {
  section: DevotionalSection;
  isFacilitatorView: boolean;
}) {
  const visibleItems = isFacilitatorView
    ? section.items
    : section.items.filter((item) => !item.facilitatorOnly);

  if (visibleItems.length === 0 && !isFacilitatorView) return null;

  const emoji = getSectionEmoji(section.type);
  const title = getSectionTitle(section);
  const subtitle =
    section.type === "passage" && section.passageReference ? ` - ${section.passageReference}` : "";

  return (
    <div className="space-y-2">
      <h3 className="font-semibold text-base text-foreground">
        {emoji} {title}
        {subtitle && <span className="font-normal text-muted-foreground">{subtitle}</span>}
      </h3>
      {visibleItems.length > 0 && (
        <div className="space-y-1.5">
          {visibleItems.map((item) => (
            <DevotionalItemRow
              key={item.id}
              item={item}
              showFacilitatorIndicator={isFacilitatorView}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DevotionalView({ viewData, isSessionAdmin: isAdmin }: SessionViewProps) {
  const data = viewData as DevotionalViewData | null;

  const [facilitatorView, setFacilitatorView] = useState(true);

  // Admins see facilitator view by default (can toggle to player view)
  // Non-admins always see player view
  const isFacilitatorView = !!isAdmin && facilitatorView;

  if (!data || data.sections.length === 0) {
    return <p className="text-sm text-muted-foreground italic">No devotional content yet.</p>;
  }

  // For non-admins, check if there's any visible content at all
  const hasVisibleContent =
    isAdmin || data.sections.some((s) => s.items.some((item) => !item.facilitatorOnly));

  if (!hasVisibleContent) {
    return <p className="text-sm text-muted-foreground italic">No devotional content available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Header row: title + facilitator toggle */}
      <div className="flex items-center justify-between gap-3">
        {data.title && <h2 className="font-bold text-lg text-foreground">{data.title}</h2>}
        {isAdmin && (
          <label className="flex items-center gap-2 shrink-0 cursor-pointer">
            <span className="text-xs text-muted-foreground">
              {facilitatorView ? "Facilitator View" : "Player View"}
            </span>
            <Switch
              checked={facilitatorView}
              onCheckedChange={setFacilitatorView}
              aria-label="Toggle between facilitator and player view"
            />
          </label>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-7">
        {data.sections.map((section) => (
          <DevotionalSectionView
            key={section.id}
            section={section}
            isFacilitatorView={isFacilitatorView}
          />
        ))}
      </div>
    </div>
  );
}
