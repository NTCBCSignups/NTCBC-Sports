"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import AlternateViewToggle from "@/components/sports/alternate-view-toggle";
import EditViewsDialog from "@/components/sports/edit-views-dialog";
import { getAlternateView, getAllAlternateViews } from "@/config/alternate-view-registry";
import type { SignupRow } from "@/components/sports/session-signups-table";

interface AttendanceSectionProps {
    sport: string;
    sessionId: string;
    signups: SignupRow[];
    teamMemberIds: Set<string>;
    playerCap: number | null;
    currentUserId: string | null;
    viewData: Record<string, unknown>;
    isAdmin: boolean;
}

/**
 * Client wrapper for the attendance section on the session detail page.
 * Manages toggle state between default attendance view and alternate views.
 * Persists active view in URL search params (?view=...) so it survives refresh.
 *
 * Users see the toggle only for views that have saved data.
 * Admins always see the "Edit Views" button to create/edit any registered view type.
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

    // Views with saved data — shown to all users in the toggle
    const configuredViews = getAllAlternateViews().filter((v) => viewData[v.id] != null);

    const viewParam = searchParams.get("view");
    const activeView = configuredViews.some((v) => v.id === viewParam) ? viewParam : null;

    const setActiveView = (viewId: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (viewId) {
            params.set("view", viewId);
        } else {
            params.delete("view");
        }
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    };

    const hasConfiguredViews = configuredViews.length > 0;
    const entry = activeView ? getAlternateView(activeView) : null;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-foreground">Attendance</h2>
                    {hasConfiguredViews && (
                        <AlternateViewToggle
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
