"use client";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

import { ChevronDown } from "lucide-react";

interface ViewToggleProps {
    views: { id: string; label: string }[];
    activeView: string | null;
    onViewChange: (viewId: string | null) => void;
}

/**
 * Lets users switch between configured session views.
 * Only rendered when there are 2+ views.
 */
export default function ViewToggle({
    views,
    activeView,
    onViewChange,
}: ViewToggleProps) {
    if (views.length < 2) return null;

    return (
        <Select
            value={activeView ?? views[0].id}
            onValueChange={(v) => onViewChange(v)}
        >
            <SelectTrigger className="h-auto border-none shadow-none focus-visible:ring-0 focus-visible:border-none dark:bg-transparent dark:hover:bg-transparent px-0 py-0 font-semibold text-foreground text-base gap-1 w-auto underline decoration-muted-foreground/40 underline-offset-4 hover:decoration-foreground [&>svg:last-child]:hidden">
                <SelectValue />
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
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
