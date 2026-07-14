"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import AttendanceView from "@/components/sports/session/session-views/attendance-view";
import ViewToggle from "@/components/sports/session/view-toggle";
import EditViewsDialog from "@/components/sports/session/edit-views-dialog";
import type { EditViewsDialogHandle } from "@/components/sports/session/edit-views-dialog";
import { Button } from "@/components/ui/button";
import { Link as LinkIcon, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { getSessionView } from "@/components/sports/session/session-views/registry";
import { displayName } from "@/lib/format";
import type { SignupRow } from "@/components/sports/session/session-signups-table";
import type { StoredViewInstance } from "@/lib/supabase/types";

const SECTION_ANCHOR = "session-views";

interface SessionViewSectionProps {
  sport: string;
  sessionId: string;
  signups: SignupRow[];
  teamMemberIds: Set<string>;
  playerCap: number | null;
  currentUserId: string | null;
  viewData: StoredViewInstance[];
  isSessionAdmin: boolean;
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
  isSessionAdmin,
}: SessionViewSectionProps) {
  const searchParams = useSearchParams();
  const sectionRef = useRef<HTMLDivElement>(null);
  const [activeView, setActiveView] = useState<string | null>(searchParams.get("view"));
  const editViewsRef = useRef<EditViewsDialogHandle>(null);

  // Scroll to section on mount if hash matches anchor
  useEffect(() => {
    if (window.location.hash === `#${SECTION_ANCHOR}`) {
      sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleViewChange = (viewId: string | null) => {
    setActiveView(viewId);
    const params = new URLSearchParams(window.location.search);
    if (viewId) {
      params.set("view", viewId);
    } else {
      params.delete("view");
    }
    const qs = params.size ? `?${params}` : "";
    const newUrl = `${window.location.pathname}${qs}${viewId ? `#${SECTION_ANCHOR}` : ""}`;
    window.history.replaceState(null, "", newUrl);
  };

  const copyViewLink = (instance: StoredViewInstance) => {
    const params = new URLSearchParams(window.location.search);
    params.set("view", String(instance.id));
    const url = `${window.location.origin}${window.location.pathname}?${params}#${SECTION_ANCHOR}`;
    navigator.clipboard.writeText(url).then(
      () => toast.success("Link copied to clipboard"),
      () => toast.error("Failed to copy link"),
    );
  };

  // Shared admin action buttons — rendered in both branches
  const hasDevo = viewData.some((v) => v.type === "devotionalView");
  const adminButtons = isSessionAdmin ? (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="text-xs h-7"
        onClick={() => editViewsRef.current?.openToType("devotionalView")}
      >
        {hasDevo ? <Pencil className="h-3 w-3 mr-1" /> : <Plus className="h-3 w-3 mr-1" />}
        {"Devo"}
      </Button>
      <EditViewsDialog
        ref={editViewsRef}
        sport={sport}
        sessionId={sessionId}
        signups={signups}
        teamMemberIds={teamMemberIds}
        viewData={viewData}
      />
    </div>
  ) : null;

  // Empty viewData = no views configured yet → fall back to attendance view
  if (viewData.length === 0) {
    return (
      <div ref={sectionRef} id={SECTION_ANCHOR} className="space-y-2 scroll-mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-foreground">Attendance</h2>
          {adminButtons}
        </div>
        <AttendanceView
          signups={signups}
          teamMemberIds={teamMemberIds}
          playerCap={playerCap}
          currentUserId={currentUserId}
          viewData={null}
          isSessionAdmin={isSessionAdmin}
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

  const resolvedView =
    configuredViews.length > 0
      ? configuredViews.some((v) => v.id === activeView)
        ? activeView!
        : configuredViews[0]!.id
      : null;

  const activeInstance = resolvedView ? viewData.find((v) => v.id === Number(resolvedView)) : null;
  const entry = activeInstance ? getSessionView(activeInstance.type) : undefined;

  return (
    <div ref={sectionRef} id={SECTION_ANCHOR} className="space-y-4 scroll-mt-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
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
          {activeInstance && isSessionAdmin && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-foreground"
              onClick={() => copyViewLink(activeInstance)}
              title="Copy link to this view"
            >
              <LinkIcon className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
        {adminButtons}
      </div>

      {resolvedView && entry ? (
        <entry.ViewComponent
          signups={signups}
          teamMemberIds={teamMemberIds}
          playerCap={playerCap}
          currentUserId={currentUserId}
          viewData={activeInstance!.data}
          isSessionAdmin={isSessionAdmin}
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
    ? signups.find(
        (s) =>
          s.user_id === currentUserId && (s.status === "confirmed" || s.status === "waitlisted"),
      )
    : null;

  return (
    <div className="rounded-md border border-dashed border-muted px-3 py-2 space-y-1">
      <span className="text-xs text-muted-foreground">
        {confirmedCount} signed up{playerCap ? ` / ${playerCap}` : ""}
      </span>
      {userSignup && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{displayName(userSignup.profiles)}</span>
          <span className="text-xs">
            {userSignup.status === "confirmed" ? "✓ Signed up" : "⏳ Waitlisted"}
          </span>
        </div>
      )}
    </div>
  );
}
