"use client";

import { useState } from "react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { AlternateViewMeta } from "@/config/config-interfaces";

interface AlternateViewToggleProps {
    views: AlternateViewMeta[];
    activeView: string | null;
    onViewChange: (viewId: string | null) => void;
}

/**
 * Lets users switch between the default attendance view and configured alternate views.
 * Renders a simple toggle button for 1 alt view, or a dropdown for >1.
 */
export default function AlternateViewToggle({
    views,
    activeView,
    onViewChange,
}: AlternateViewToggleProps) {
    if (views.length === 0) return null;

    if (views.length === 1) {
        const view = views[0];
        const isActive = activeView === view.id;
        return (
            <Button
                variant={isActive ? "default" : "outline"}
                size="sm"
                onClick={() => onViewChange(isActive ? null : view.id)}
                className="text-xs h-7"
            >
                {view.label}
            </Button>
        );
    }

    return (
        <Select
            value={activeView ?? "__default__"}
            onValueChange={(v) => onViewChange(v === "__default__" ? null : v)}
        >
            <SelectTrigger size="sm" className="h-7 text-xs">
                <SelectValue />
            </SelectTrigger>
            <SelectContent>
                <SelectItem value="__default__">Attendance</SelectItem>
                {views.map((view) => (
                    <SelectItem key={view.id} value={view.id}>
                        {view.label}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
}
