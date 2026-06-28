"use client";

import { Fragment, type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Constants ────────────────────────────────────────────────────

/** How long (ms) a user must hold the grip before touch-drag activates. */
const LONG_PRESS_MS = 100;
/** Max finger movement (px) allowed during long-press before it cancels. */
const LONG_PRESS_TOLERANCE_PX = 5;

// ── Types ────────────────────────────────────────────────────────

/** Props passed to the drag handle element (the grip icon) in naked mode. */
export interface DragHandleProps {
  draggable: boolean;
  onDragStart: () => void;
  "aria-grabbed"?: boolean;
}

/** Props for the item wrapper element in naked mode. */
export interface DragItemProps {
  onDragOver: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchMove: (e: React.TouchEvent) => void;
  onTouchEnd: () => void;
  "data-section": "visible" | "hidden";
}

/** Extra context passed to renderItem in naked mode. */
export interface NakedItemContext {
  isDragging: boolean;
  touchActive: boolean;
  dragItemProps: DragItemProps;
  dragHandleProps: DragHandleProps;
}

interface DraggableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, nakedCtx?: NakedItemContext) => ReactNode;
  keyExtractor: (item: T) => string | number;
  /** Additional classes per item. Receives whether the item is currently being dragged. */
  itemClassName?: (item: T, index: number, isDragging: boolean) => string;
  /** Whether a specific item is draggable (default: all are). */
  isDraggable?: (item: T, index: number) => boolean;
  /** Container className. */
  className?: string;
  /**
   * When true, DraggableList only handles drag/drop logic and delegates ALL
   * rendering (including the grip icon and item wrapper) to `renderItem`.
   * `renderItem` receives a third arg with `dragItemProps` (spread on wrapper)
   * and `dragHandleProps` (spread on grip element).
   */
  naked?: boolean;
  /** Optional hidden section below a divider. */
  hiddenItems?: T[];
  onHiddenReorder?: (items: T[]) => void;
  renderHiddenItem?: (item: T, index: number, nakedCtx?: NakedItemContext) => ReactNode;
  hiddenItemClassName?: (item: T, index: number, isDragging: boolean) => string;
  onHide?: (index: number) => void;
  onShow?: (index: number) => void;
  dividerLabel?: string;
}

/**
 * A reorderable list with mouse drag + touch support.
 * Touch-drag requires a 500ms long-press on the grip to activate (so scrolling isn't hijacked).
 * Optionally supports a second "hidden" section separated by a divider.
 *
 * In `naked` mode, all rendering is delegated to `renderItem`. The component
 * provides `dragHandleProps` and `dragItemProps` that must be spread onto the
 * grip element and item wrapper respectively.
 */
export function DraggableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  itemClassName,
  isDraggable,
  className,
  naked,
  hiddenItems,
  onHiddenReorder,
  renderHiddenItem,
  hiddenItemClassName,
  onHide,
  onShow,
  dividerLabel = "hidden below",
}: DraggableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragSection, setDragSection] = useState<"visible" | "hidden" | null>(null);
  const [touchActive, setTouchActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Long-press state refs (to avoid re-renders during timing)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const pendingTouch = useRef<{ section: "visible" | "hidden"; index: number } | null>(null);

  const hasSplit = hiddenItems !== undefined;

  // ── Reorder logic ────────────────────────────────────────────

  const moveItem = useCallback(
    (section: "visible" | "hidden", from: number, to: number) => {
      if (section === "visible") {
        const next = [...items];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        onReorder(next);
      } else if (hiddenItems && onHiddenReorder) {
        const next = [...hiddenItems];
        const [moved] = next.splice(from, 1);
        if (moved) next.splice(to, 0, moved);
        onHiddenReorder(next);
      }
    },
    [items, onReorder, hiddenItems, onHiddenReorder],
  );

  // ── Mouse drag handlers ──────────────────────────────────────

  const handleDragStart = (section: "visible" | "hidden", index: number) => {
    setDragIndex(index);
    setDragSection(section);
  };

  const handleDragOver = (e: React.DragEvent, section: "visible" | "hidden", index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragSection === null) return;
    if (dragSection === section && dragIndex !== index) {
      moveItem(section, dragIndex, index);
      setDragIndex(index);
    }
  };

  const handleDragEnd = () => {
    setDragIndex(null);
    setDragSection(null);
  };

  // ── Touch handlers (long-press gated) ─────────────────────────

  const cancelLongPress = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pendingTouch.current = null;
    touchStartPos.current = null;
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent, section: "visible" | "hidden", index: number) => {
      cancelLongPress();
      // Prevent context menu (long-press right-click) on the grip icon
      e.preventDefault();
      const touch = e.touches[0];
      if (!touch) return;
      touchStartPos.current = { x: touch.clientX, y: touch.clientY };
      pendingTouch.current = { section, index };

      longPressTimer.current = setTimeout(() => {
        // Long-press activated — enter drag mode
        const pending = pendingTouch.current;
        if (pending) {
          setDragIndex(pending.index);
          setDragSection(pending.section);
          setTouchActive(true);
        }
        longPressTimer.current = null;
      }, LONG_PRESS_MS);
    },
    [cancelLongPress],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      const touch = "touches" in e ? e.touches[0] : null;
      if (!touch) return;

      // If long-press hasn't fired yet, check if finger moved too much → cancel
      if (longPressTimer.current && touchStartPos.current) {
        const dx = Math.abs(touch.clientX - touchStartPos.current.x);
        const dy = Math.abs(touch.clientY - touchStartPos.current.y);
        if (dx > LONG_PRESS_TOLERANCE_PX || dy > LONG_PRESS_TOLERANCE_PX) {
          cancelLongPress();
          return;
        }
      }

      // If drag is active, reorder based on touch position
      if (dragIndex === null || dragSection === null || !containerRef.current) return;
      e.preventDefault(); // prevent scroll — works because we attach as non-passive

      const elements = containerRef.current.querySelectorAll<HTMLElement>(
        `[data-section="${dragSection}"]`,
      );
      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (touch.clientY >= rect.top && touch.clientY <= rect.bottom && i !== dragIndex) {
          moveItem(dragSection, dragIndex, i);
          setDragIndex(i);
          break;
        }
      }
      // Cross-section: check divider
      if (hasSplit) {
        const divider = containerRef.current.querySelector<HTMLElement>("[data-divider]");
        if (divider) {
          const rect = divider.getBoundingClientRect();
          if (touch.clientY >= rect.top && touch.clientY <= rect.bottom) {
            if (dragSection === "visible" && onHide) {
              onHide(dragIndex);
            } else if (dragSection === "hidden" && onShow) {
              onShow(dragIndex);
            }
            setDragIndex(null);
            setDragSection(null);
            setTouchActive(false);
          }
        }
      }
    },
    [dragIndex, dragSection, hasSplit, onHide, onShow, cancelLongPress, moveItem],
  );

  // Attach non-passive touchmove on container when drag is active (so preventDefault works)
  useEffect(() => {
    const container = containerRef.current;
    if (!touchActive || !container) return;
    const handler = (e: TouchEvent) => handleTouchMove(e);
    container.addEventListener("touchmove", handler, { passive: false });
    return () => container.removeEventListener("touchmove", handler);
  }, [touchActive, handleTouchMove]);

  const handleTouchEnd = useCallback(() => {
    cancelLongPress();
    setDragIndex(null);
    setDragSection(null);
    setTouchActive(false);
  }, [cancelLongPress]);

  // ── Cross-section divider drop ───────────────────────────────

  const handleDividerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDividerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (dragIndex === null || dragSection === null) return;
    if (dragSection === "visible" && onHide) {
      onHide(dragIndex);
    } else if (dragSection === "hidden" && onShow) {
      onShow(dragIndex);
    }
    setDragIndex(null);
    setDragSection(null);
  };

  // ── Render helpers ─────────────────────────────────────────────

  const getDragItemProps = (section: "visible" | "hidden", index: number): DragItemProps => ({
    onDragOver: (e: React.DragEvent) => handleDragOver(e, section, index),
    onDragEnd: handleDragEnd,
    onTouchStart: (e: React.TouchEvent) => handleTouchStart(e, section, index),
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    "data-section": section,
  });

  const getDragHandleProps = (section: "visible" | "hidden", index: number): DragHandleProps => ({
    draggable: true,
    onDragStart: () => handleDragStart(section, index),
    "aria-grabbed": dragIndex === index && dragSection === section,
  });

  // ── Render ───────────────────────────────────────────────────

  if (naked) {
    return (
      <div ref={containerRef} className={cn("space-y-1", className)}>
        {items.map((item, index) => {
          const isDragging = dragIndex === index && dragSection === "visible";
          const ctx: NakedItemContext = {
            isDragging,
            touchActive,
            dragItemProps: getDragItemProps("visible", index),
            dragHandleProps: getDragHandleProps("visible", index),
          };
          return <Fragment key={keyExtractor(item)}>{renderItem(item, index, ctx)}</Fragment>;
        })}

        {hasSplit && (
          <>
            <div
              data-divider
              onDragOver={handleDividerDragOver}
              onDrop={handleDividerDrop}
              className="flex items-center gap-2 py-2 my-1"
            >
              <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
              <span className="text-xs text-muted-foreground px-2">{dividerLabel}</span>
              <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
            </div>

            {hiddenItems!.map((item, index) => {
              const isDragging = dragIndex === index && dragSection === "hidden";
              const ctx: NakedItemContext = {
                isDragging,
                touchActive,
                dragItemProps: getDragItemProps("hidden", index),
                dragHandleProps: getDragHandleProps("hidden", index),
              };
              const render = renderHiddenItem ?? renderItem;
              return <Fragment key={keyExtractor(item)}>{render(item, index, ctx)}</Fragment>;
            })}
          </>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("space-y-1", className)}>
      {items.map((item, index) => {
        const draggable = isDraggable ? isDraggable(item, index) : true;
        const isDragging = dragIndex === index && dragSection === "visible";
        return (
          <div
            key={keyExtractor(item)}
            data-section="visible"
            draggable={draggable}
            onDragStart={() => handleDragStart("visible", index)}
            onDragOver={(e) => handleDragOver(e, "visible", index)}
            onDragEnd={handleDragEnd}
            onTouchStart={(e) => handleTouchStart(e, "visible", index)}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className={cn(
              "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
              draggable && "cursor-grab active:cursor-grabbing",
              touchActive && isDragging && "touch-none",
              isDragging ? "bg-muted border-primary" : "bg-card",
              itemClassName?.(item, index, isDragging),
            )}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
            {renderItem(item, index)}
          </div>
        );
      })}

      {hasSplit && (
        <>
          <div
            data-divider
            onDragOver={handleDividerDragOver}
            onDrop={handleDividerDrop}
            className="flex items-center gap-2 py-2 my-1"
          >
            <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
            <span className="text-xs text-muted-foreground px-2">{dividerLabel}</span>
            <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
          </div>

          {hiddenItems!.map((item, index) => {
            const isDragging = dragIndex === index && dragSection === "hidden";
            return (
              <div
                key={keyExtractor(item)}
                data-section="hidden"
                draggable
                onDragStart={() => handleDragStart("hidden", index)}
                onDragOver={(e) => handleDragOver(e, "hidden", index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, "hidden", index)}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                className={cn(
                  "flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing transition-colors opacity-50",
                  touchActive && isDragging && "touch-none",
                  isDragging ? "bg-muted border-primary" : "bg-card",
                  hiddenItemClassName?.(item, index, isDragging),
                )}
              >
                <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                {renderHiddenItem ? renderHiddenItem(item, index) : renderItem(item, index)}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
