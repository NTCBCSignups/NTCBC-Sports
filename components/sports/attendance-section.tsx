"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import ViewToggle from "@/components/sports/view-toggle";
import EditViewsDialog from "@/components/sports/edit-views-dialog";
import { getSessionView } from "@/components/sports/session-views/registry";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";

interface AttendanceSectionProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId: string | null;
    viewData: Record<string, StoredViewInstance>;
    isAdmin: boolean;
}

/**
 * Client wrapper for the session views section on the session detail page.
 * Manages toggle state between views and persists selection in URL (?view=...).
 *
 * - Empty viewData: shows default attendance table (implicit).
 * - Non-empty viewData: shows toggle with all configured view instances.
 */
export default function AttendanceSection({
    sport,
    sessionId,
    signups,
    teamMemberIds,
    playerCap,
    currentUserId,
    viewData,
    isAdmin,
}: AttendanceSectionProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();

    const viewEntries = Object.entries(viewData);
    const hasViews = viewEntries.length > 0;

    // All configured views for the toggle
    const configuredViews = viewEntries.map(([id, instance]) => ({
        id,
        label: instance.label,
    }));

    const viewParam = searchParams.get("view");
    // Default to first view if views exist and no param specified
    const activeView = hasViews
        ? configuredViews.some((v) => v.id === viewParam)
            ? viewParam!
            : configuredViews[0].id
        : null;

    const setActiveView = (viewId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (viewId) {
            params.set("view", viewId);
        } else {
            params.delete("view");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    // Resolve the active view's component
    const activeInstance = activeView ? viewData[activeView] : null;
    const entry = activeInstance ? getSessionView(activeInstance.type) : undefined;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">Attendance</h2>
                    {configuredViews.length > 1 && (
                        <ViewToggle
                            views={configuredViews}
                            activeView={activeView}
                            onViewChange={setActiveView}
                        />
                    )}
                </div>
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

            {activeView && entry ? (
                <entry.ViewComponent
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    viewData={activeInstance!.data}
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
