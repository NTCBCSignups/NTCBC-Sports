"use client";

import { Fragment, type ReactNode, useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Exported types ───────────────────────────────────────────────

export interface DragHandleProps {
  ref: (node: HTMLElement | null) => void;
  listeners: Record<string, unknown>;
  "aria-grabbed"?: boolean;
}

export interface DragItemProps {
  ref: (node: HTMLElement | null) => void;
  style: React.CSSProperties;
  [key: string]: unknown;
}

export interface NakedItemContext {
  isDragging: boolean;
  dragItemProps: DragItemProps;
  dragHandleProps: DragHandleProps;
}

// ── Props ────────────────────────────────────────────────────────

interface DraggableListProps<T> {
  items: T[];
  onReorder: (items: T[]) => void;
  renderItem: (item: T, index: number, nakedCtx?: NakedItemContext) => ReactNode;
  keyExtractor: (item: T) => string | number;
  itemClassName?: (item: T, index: number, isDragging: boolean) => string;
  isDraggable?: (item: T, index: number) => boolean;
  className?: string;
  /** Delegate all rendering (including grip) to renderItem. */
  naked?: boolean;
  hiddenItems?: T[];
  onHiddenReorder?: (items: T[]) => void;
  renderHiddenItem?: (item: T, index: number, nakedCtx?: NakedItemContext) => ReactNode;
  hiddenItemClassName?: (item: T, index: number, isDragging: boolean) => string;
  onHide?: (index: number) => void;
  onShow?: (index: number) => void;
  dividerLabel?: string;
}

// Touch: 100ms hold + 5px tolerance so scrolling isn't hijacked.
const TOUCH_CONSTRAINT = { delay: 100, tolerance: 5 };

// ── Main component ───────────────────────────────────────────────

export function DraggableList<T>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  itemClassName,
  isDraggable: isDraggableFn,
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
  const [_activeId, setActiveId] = useState<string | number | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: TOUCH_CONSTRAINT }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const hasSplit = hiddenItems !== undefined;
  const visibleIds = items.map(keyExtractor).map(String);
  const hiddenIds = hasSplit ? hiddenItems!.map(keyExtractor).map(String) : [];

  const handleDragStart = (e: DragStartEvent) => setActiveId(e.active.id);

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const aStr = String(active.id);
    const oStr = String(over.id);
    const aVis = visibleIds.indexOf(aStr);
    const oVis = visibleIds.indexOf(oStr);

    if (aVis !== -1 && oVis !== -1) {
      const next = [...items];
      const [moved] = next.splice(aVis, 1);
      if (moved) next.splice(oVis, 0, moved);
      onReorder(next);
      return;
    }

    if (hasSplit && hiddenItems && onHiddenReorder) {
      const aHid = hiddenIds.indexOf(aStr);
      const oHid = hiddenIds.indexOf(oStr);
      if (aHid !== -1 && oHid !== -1) {
        const next = [...hiddenItems];
        const [moved] = next.splice(aHid, 1);
        if (moved) next.splice(oHid, 0, moved);
        onHiddenReorder(next);
        return;
      }
      if (aVis !== -1 && oHid !== -1 && onHide) {
        onHide(aVis);
        return;
      }
      if (aHid !== -1 && oVis !== -1 && onShow) {
        onShow(aHid);
        return;
      }
    }
  };

  // ── Render ───────────────────────────────────────────────────

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <div className={cn("space-y-1", className)}>
          {items.map((item, index) =>
            naked ? (
              <NakedItem
                key={keyExtractor(item)}
                id={String(keyExtractor(item))}
                item={item}
                index={index}
                renderItem={renderItem}
              />
            ) : (
              <StandardItem
                key={keyExtractor(item)}
                id={String(keyExtractor(item))}
                item={item}
                index={index}
                renderItem={renderItem}
                isDraggableFn={isDraggableFn}
                itemClassName={itemClassName}
              />
            ),
          )}
        </div>
      </SortableContext>

      {hasSplit && hiddenItems && (
        <>
          <div className="flex items-center gap-2 py-2 my-1">
            <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
            <span className="text-xs text-muted-foreground px-2">{dividerLabel}</span>
            <div className="flex-1 border-t border-dashed border-muted-foreground/50" />
          </div>
          <SortableContext items={hiddenIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-1">
              {hiddenItems.map((item, index) => {
                const render = renderHiddenItem ?? renderItem;
                return naked ? (
                  <NakedItem
                    key={keyExtractor(item)}
                    id={String(keyExtractor(item))}
                    item={item}
                    index={index}
                    renderItem={render}
                  />
                ) : (
                  <StandardItem
                    key={keyExtractor(item)}
                    id={String(keyExtractor(item))}
                    item={item}
                    index={index}
                    renderItem={render}
                    itemClassName={hiddenItemClassName}
                    isHidden
                  />
                );
              })}
            </div>
          </SortableContext>
        </>
      )}
    </DndContext>
  );
}

// ── Item components ──────────────────────────────────────────────

function StandardItem<T>({
  id,
  item,
  index,
  renderItem,
  isDraggableFn,
  itemClassName,
  isHidden,
}: {
  id: string;
  item: T;
  index: number;
  renderItem: (item: T, index: number) => ReactNode;
  isDraggableFn?: (item: T, index: number) => boolean;
  itemClassName?: (item: T, index: number, isDragging: boolean) => string;
  isHidden?: boolean;
}) {
  const draggable = isDraggableFn ? isDraggableFn(item, index) : true;
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !draggable });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging ? "bg-muted border-primary opacity-75 z-10" : "bg-card",
        isHidden && "opacity-50",
        itemClassName?.(item, index, isDragging),
      )}
      {...attributes}
    >
      <div ref={setActivatorNodeRef} {...listeners} className="shrink-0 touch-none">
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>
      {renderItem(item, index)}
    </div>
  );
}

function NakedItem<T>({
  id,
  item,
  index,
  renderItem,
}: {
  id: string;
  item: T;
  index: number;
  renderItem: (item: T, index: number, nakedCtx?: NakedItemContext) => ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });
  const style: React.CSSProperties = { transform: CSS.Transform.toString(transform), transition };

  const ctx: NakedItemContext = {
    isDragging,
    dragItemProps: { ref: setNodeRef, style, ...attributes },
    dragHandleProps: {
      ref: setActivatorNodeRef,
      listeners: listeners ?? {},
      "aria-grabbed": isDragging,
    },
  };

  return <Fragment>{renderItem(item, index, ctx)}</Fragment>;
}
