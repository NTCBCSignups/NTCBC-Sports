"use client";

import { useState } from "react";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import AlternateViewToggle from "@/components/sports/alternate-view-toggle";
import EditViewsDialog from "@/components/sports/edit-views-dialog";
import { getAlternateView } from "@/config/alternate-view-registry";
import type { AlternateViewMeta } from "@/config/config-interfaces";
import type { SignupRow } from "@/components/sports/session-signups-table";

interface AttendanceSectionProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId: string | null;
    alternateViews: AlternateViewMeta[];
    viewData: Record<string, unknown>;
    isAdmin: boolean;
}

/**
 * Client wrapper for the attendance section on the session detail page.
 * Manages toggle state between default attendance view and alternate views.
 */
export default function AttendanceSection({
    sport,
    sessionId,
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
    alternateViews,
    viewData,
    isAdmin,
}: AttendanceSectionProps) {
    const [activeView, setActiveView] = useState<string | null>(null);

    const hasAltViews = alternateViews.length > 0;
    const entry = activeView ? getAlternateView(activeView) : null;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">Attendance</h2>
                    {hasAltViews && (
                        <AlternateViewToggle
                            views={alternateViews}
                            activeView={activeView}
                            onViewChange={setActiveView}
                        />
                    )}
                </div>
                {isAdmin && hasAltViews && (
                    <EditViewsDialog
                        sport={sport}
                        sessionId={sessionId}
                        views={alternateViews}
                        signups={signups}
                        teamMemberIds={teamMemberIds}
                        viewData={viewData}
                    />
                )}
            </div>

            {activeView && entry ? (
                <entry.ViewComponent
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    viewData={viewData[activeView] ?? null}
                />
            ) : (
                <SessionSignupsTable
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    showTimestamp
                />
            )}
        </div>
    );
}
