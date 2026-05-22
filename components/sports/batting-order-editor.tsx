"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { GripVertical } from "lucide-react";
import { displayName } from "@/lib/format";
import { updateSessionViewData } from "@/lib/actions/sessions";
import type { AlternateViewEditorProps } from "@/config/alternate-view-registry";

/**
 * Batting order editor — drag-drop reorderable list of confirmed signups.
 * Rendered inside the edit-views dialog when "Batting Order" is selected.
 */
export default function BattingOrderEditor({
    sport,
    sessionId,
    signups,
    teamMemberIds,
    viewData,
    onSaved,
}: AlternateViewEditorProps) {
    const currentOrder = Array.isArray(viewData) ? (viewData as string[]) : [];
    const confirmed = signups.filter((s) => s.status === "confirmed");

    // Build initial order: saved order first, then any new confirmed players appended
    const buildInitialOrder = () => {
        const confirmedMap = new Map(confirmed.map((s) => [s.user_id, s]));
        const ordered: typeof confirmed = [];

        for (const userId of currentOrder) {
            const signup = confirmedMap.get(userId);
            if (signup) {
                ordered.push(signup);
                confirmedMap.delete(userId);
            }
        }
        for (const signup of confirmedMap.values()) {
            ordered.push(signup);
        }
        return ordered;
    };

    const [items, setItems] = useState(buildInitialOrder);
    const [isPending, startTransition] = useTransition();
    const [dragIndex, setDragIndex] = useState<number | null>(null);

    const moveItem = (from: number, to: number) => {
        setItems((prev) => {
            const next = [...prev];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            return next;
        });
    };

    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex !== null && dragIndex !== index) {
            moveItem(dragIndex, index);
            setDragIndex(index);
        }
    };

    const handleDragEnd = () => {
        setDragIndex(null);
    };

    const handleSave = () => {
        const newOrder = items.map((s) => s.user_id);
        startTransition(async () => {
            const result = await updateSessionViewData(sport, sessionId, "battingOrder", newOrder);
            if ("success" in result) {
                onSaved();
            }
        });
    };

    if (confirmed.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-4">
                No confirmed sign-ups to reorder.
            </p>
        );
    }

    return (
        <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
                Drag players to set the batting order.
            </p>
            <div className="space-y-1 max-h-80 overflow-y-auto">
                {items.map((signup, index) => (
                    <div
                        key={signup.user_id}
                        draggable
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={(e) => handleDragOver(e, index)}
                        onDragEnd={handleDragEnd}
                        className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-grab active:cursor-grabbing transition-colors ${
                            dragIndex === index ? "bg-muted border-primary" : "bg-card"
                        }`}
                    >
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="font-mono text-xs text-muted-foreground w-6">
                            {index + 1}
                        </span>
                        <span className="text-sm">{displayName(signup.profiles)}</span>
                    </div>
                ))}
            </div>
            <div className="flex justify-end">
                <Button onClick={handleSave} disabled={isPending} size="sm">
                    {isPending ? "Saving…" : "Save Order"}
                </Button>
            </div>
        </div>
    );
}
