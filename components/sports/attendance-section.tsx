"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import ViewToggle from "@/components/sports/view-toggle";
import EditViewsDialog from "@/components/sports/edit-views-dialog";
import { getSessionView, DEFAULT_VIEW_TYPE } from "@/components/sports/session-views/registry";
import { displayName } from "@/lib/format";
import type { SignupRow } from "@/components/sports/session-signups-table";
import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";

interface AttendanceSectionProps {
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
 * Manages toggle state between views and persists selection in URL (?view=...).
 *
 * - Empty viewData: shows collapsed attendance hint (user's row + count).
 * - Non-empty viewData: shows enabled views via registry.
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

    // Empty viewData = no views configured, show collapsed attendance hint
    // Empty viewData = no views configured yet → show attendance table directly
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
                <SessionSignupsTable
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    showTimestamp
                />
            </div>
        );
    }

    // Non-empty viewData: use configured views
    const configuredViews = viewData
        .filter((v) => v.enabled !== false)
        .map((v) => ({ id: String(v.id), label: v.label }));

    const viewParam = searchParams.get("view");
    const activeView = configuredViews.length > 0
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

    const activeInstance = activeView ? viewData.find((v) => v.id === Number(activeView)) : null;
    const entry = activeInstance ? getSessionView(activeInstance.type) : undefined;

    return (
        <div className="space-y-2">
            <div className="flex items-center justify-between">
                {configuredViews.length > 1 ? (
                    <ViewToggle
                        views={configuredViews}
                        activeView={activeView}
                        onViewChange={setActiveView}
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

            {activeView && entry ? (
                <entry.ViewComponent
                    signups={signups}
                    teamMemberIds={teamMemberIds}
                    playerCap={playerCap}
                    currentUserId={currentUserId}
                    viewData={activeInstance!.data}
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
