"use client";

import { type ReactNode, useRef, useState } from "react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Types ────────────────────────────────────────────────────────

interface DraggableListProps<T> {
    items: T[];
    onReorder: (items: T[]) => void;
    renderItem: (item: T, index: number) => ReactNode;
    keyExtractor: (item: T) => string | number;
    /** Additional classes per item. Receives whether the item is currently being dragged. */
    itemClassName?: (item: T, index: number, isDragging: boolean) => string;
    /** Whether a specific item is draggable (default: all are). */
    isDraggable?: (item: T, index: number) => boolean;
    /** Container className. */
    className?: string;
    /** Optional hidden section below a divider. */
    hiddenItems?: T[];
    onHiddenReorder?: (items: T[]) => void;
    renderHiddenItem?: (item: T, index: number) => ReactNode;
    hiddenItemClassName?: (item: T, index: number, isDragging: boolean) => string;
    onHide?: (index: number) => void;
    onShow?: (index: number) => void;
    dividerLabel?: string;
}

/**
 * A reorderable list with mouse drag + touch support.
 * Optionally supports a second "hidden" section separated by a divider.
 */
export function DraggableList<T>({
    items,
    onReorder,
    renderItem,
    keyExtractor,
    itemClassName,
    isDraggable,
    className,
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
    const containerRef = useRef<HTMLDivElement>(null);

    const hasSplit = hiddenItems !== undefined;

    // ── Reorder logic ────────────────────────────────────────────

    const moveItem = (section: "visible" | "hidden", from: number, to: number) => {
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
    };

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

    // ── Touch handlers ───────────────────────────────────────────

    const handleTouchStart = (section: "visible" | "hidden", index: number) => {
        setDragIndex(index);
        setDragSection(section);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (dragIndex === null || dragSection === null || !containerRef.current) return;
        const touch = e.touches[0];
        if (!touch) return;
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
                }
            }
        }
    };

    const handleTouchEnd = () => {
        setDragIndex(null);
        setDragSection(null);
    };

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

    // ── Render ───────────────────────────────────────────────────

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
                        onTouchStart={() => handleTouchStart("visible", index)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        className={cn(
                            "flex items-center gap-2 rounded-md border px-3 py-2 transition-colors",
                            draggable && "cursor-grab active:cursor-grabbing touch-none",
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
                                onTouchStart={() => handleTouchStart("hidden", index)}
                                onTouchMove={handleTouchMove}
                                onTouchEnd={handleTouchEnd}
                                className={cn(
                                    "flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing touch-none transition-colors opacity-50",
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
