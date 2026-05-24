"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import AttendanceView from "@/components/sports/session-views/attendance-view";
import ViewToggle from "@/components/sports/view-toggle";
import EditViewsDialog from "@/components/sports/edit-views-dialog";
import { getSessionView } from "@/components/sports/session-views/registry";
import { displayName } from "@/lib/format";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/lib/supabase/types";

interface SessionViewSectionProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId: string | null;
    viewData: StoredViewInstance[];
    isAdmin: boolean;
}

/**
 * Client wrapper for the session views section on the session detail page.
 * Manages toggle state between views via local state for instant switching.
 *
 * - Empty viewData: shows full attendance table (no views configured yet).
 * - Non-empty, all disabled: shows collapsed hint (count + user's row).
 * - Non-empty, has enabled: shows view toggle + active view component.
 */
export default function SessionViewSection({
    sport,
    sessionId,
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
    viewData,
    isAdmin,
}: SessionViewSectionProps) {
    const searchParams = useSearchParams();
    const [activeView, setActiveView] = useState<string | null>(
        searchParams.get("view"),
    );

    const handleViewChange = (viewId: string | null) => {
        setActiveView(viewId);
        const params = new URLSearchParams(window.location.search);
        if (viewId) {
            params.set("view", viewId);
        } else {
            params.delete("view");
        }
        const newUrl = `${window.location.pathname}${params.size ? `?${params}` : ""}`;
        window.history.replaceState(null, "", newUrl);
    };

    // Empty viewData = no views configured yet → fall back to attendance view
    if (viewData.length === 0) {
        return (
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-foreground">Attendance</h2>
                    {isAdmin && (
                        <EditViewsDialog
                            sport={sport}
                            sessionId={sessionId}
                            signups={signups}
                            teamMemberIds={teamMemberIds}
                            viewData={viewData}
                        />
                    )}
                </div>
                <AttendanceView
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    viewData={null}
                    isAdmin={isAdmin}
                    sport={sport}
                    sessionId={sessionId}
                />
            </div>
        );
    }

    // Non-empty viewData: use configured views
    const configuredViews = viewData
        .filter((v) => v.enabled !== false)
        .map((v) => ({ id: String(v.id), label: v.label }));

    const resolvedView = configuredViews.length > 0
        ? configuredViews.some((v) => v.id === activeView)
            ? activeView!
            : configuredViews[0].id
        : null;

    const activeInstance = resolvedView ? viewData.find((v) => v.id === Number(resolvedView)) : null;
    const entry = activeInstance ? getSessionView(activeInstance.type) : undefined;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                {configuredViews.length > 1 ? (
                    <ViewToggle
                        views={configuredViews}
                        activeView={resolvedView}
                        onViewChange={handleViewChange}
                    />
                ) : (
                    <h2 className="font-semibold text-foreground">
                        {configuredViews[0]?.label ?? "Attendance"}
                    </h2>
                )}
                {isAdmin && (
                    <EditViewsDialog
                        sport={sport}
                        sessionId={sessionId}
                        signups={signups}
                        teamMemberIds={teamMemberIds}
                        viewData={viewData}
                    />
                )}
            </div>

            {resolvedView && entry ? (
                <entry.ViewComponent
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    viewData={activeInstance!.data}
                    isAdmin={isAdmin}
                    sport={sport}
                    sessionId={sessionId}
                />
            ) : configuredViews.length === 0 ? (
                <CollapsedAttendanceHint
                    signups={signups}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                />
            ) : null}
        </div>
    );
}

function CollapsedAttendanceHint({
    signups,
    playerCap,
    currentUserId,
}: {
    signups: SignupRow[];
    playerCap: number | null;
    currentUserId: string | null;
}) {
    const confirmedCount = signups.filter((s) => s.status === "confirmed").length;
    const userSignup = currentUserId
        ? signups.find((s) => s.user_id === currentUserId && (s.status === "confirmed" || s.status === "waitlisted"))
        : null;

    return (
        <div className="rounded-md border border-dashed border-muted px-3 py-2 space-y-1">
            <span className="text-xs text-muted-foreground">
                {confirmedCount} signed up{playerCap ? ` / ${playerCap}` : ""}
            </span>
            {userSignup && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">
                        {displayName(userSignup.profiles)}
                    </span>
                    <span className="text-xs">
                        {userSignup.status === "confirmed" ? "✓ Signed up" : "⏳ Waitlisted"}
                    </span>
                </div>
            )}
        </div>
    );
}
