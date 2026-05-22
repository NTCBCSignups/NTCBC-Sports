import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Badge } from "@/components/ui/badge";
import {
  Ban,
  CalendarDays,
  Clock,
  MapPin,
  UserStar,
} from "lucide-react";
import PageHeader from "@/components/sports/page-header";
import SignupButton from "@/components/sports/signup-button";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import SignInToSignupBanner from "@/components/sports/sign-in-to-signup-banner";
import CancelSessionButton from "@/components/sports/cancel-session-button";
import RestoreSessionButton from "@/components/sports/restore-session-button";
import SessionDialog from "@/components/sports/session-dialog";
import StatusBanner from "@/components/sports/status-banner";
import AdminButton from "@/components/sports/admin-button";
import { isSignupOpen } from "@/lib/signup-capacity";
import AttendanceSection from "@/components/sports/attendance-section";
import CountdownTimer from "@/components/sports/countdown-timer";
import LocalTimestamp from "@/components/sports/local-timestamp";

import { resolvedSportsConfig, getResolvedTab, Role, AccessLevel } from "@/config/config-resolver";
import { formatDate, formatTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { sessionTypePillClass } from "@/lib/session-type-pill";
import { LoadingContent } from "@/components/sports/loading-content";
import {
  getSession,
  getSessionSignups,
  getTeamMembers,
  getUserSignupStatus,
  getUserAccessRequestStatus,
} from "@/lib/get-data";
import type { User } from "@supabase/supabase-js";
import type { StoredViewInstance } from "@/components/sports/session-views/interfaces";
import { SESSION_STATUS } from "@/lib/supabase/types";

async function SessionSignupsContent({
  sessionId,
  sport,
  user,
  isOpen,
  userRole,
  signupRole,
  playerCap,
  viewData,
  isAdmin,
}: {
  sessionId: string;
  sport: string;
  user: User | null;
  isOpen: boolean;
  userRole: Role;
  signupRole: Role;
  playerCap: number | null;
  viewData: Record<string, StoredViewInstance>;
  isAdmin: boolean;
}) {
  const userId = user?.id ?? null;
  const canSignup = userRole >= signupRole;
  const needsTeamAccess = !!user && userRole < signupRole;

  const [rawSignups, teamMemberIds, userSignupStatus, accessRequestStatus] =
    await Promise.all([
      getSessionSignups(sessionId),
      getTeamMembers(sport),
      userId ? getUserSignupStatus(userId, sessionId) : Promise.resolve(null),
      needsTeamAccess
        ? getUserAccessRequestStatus(userId!, sport)
        : Promise.resolve(null),
    ]);

  const requestApproved = accessRequestStatus === "approved";
  const showTeamGate = needsTeamAccess && !requestApproved;
  const showSignupButton = canSignup || requestApproved;

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {!user && signupRole > userRole && (
          <SignInToSignupBanner />
        )}
        {showTeamGate && (
          <TeamAccessBanner
            requestStatus={accessRequestStatus}
            sport={sport}
          />
        )}

        {showSignupButton && (
          <SignupButton
            sessionId={sessionId}
            isOpen={isOpen}
            userSignupStatus={userSignupStatus}
            isEligible
            showStatusText={false}
          />
        )}
      </div>

      <div className="space-y-2">
        <AttendanceSection
          sport={sport}
          sessionId={sessionId}
          signups={rawSignups}
          teamMemberIds={teamMemberIds}
          playerCap={playerCap}
          currentUserId={userId}
          viewData={viewData}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

export default async function SessionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string; id: string }>;
  searchParams: Promise<{ fromTab?: string }>;
}) {
  const { sport, id } = await params;
  const { fromTab } = await searchParams;
  const config = resolvedSportsConfig[sport];
  if (!config) notFound();

  const supabase = await createClient();

  const user = await getUser();

  const [session, roleResult] = await Promise.all([
    getSession(id),
    user
      ? getUserSportRole(supabase, user.id, sport)
      : Promise.resolve({ role: Role.anon, isAdmin: false, isTeamMember: false }),
  ]);

  // Redirect to sport page if session doesn't exist or user lacks view access
  const tab = getResolvedTab(config, session?.session_type ?? "");
  const userRole = user
    ? roleResult.role
    : Role.anon;

  if (!session || userRole < tab.permissions[AccessLevel.view]) {
    redirect(`/${sport}`);
  }

  const isAdmin = userRole >= tab.permissions[AccessLevel.admin];

  const isOpen = session.status !== SESSION_STATUS.cancelled && isSignupOpen(session);
  const sessionTypeLabel = tab.label;
  const backParams = new URLSearchParams({ session: id });
  if (fromTab) backParams.set("tab", fromTab);

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <PageHeader
        backHref={`/${sport}?${backParams.toString()}`}
        backLabel={`Back to ${config.name}`}
        actions={
          isAdmin ? (
            <AdminButton sport={sport} />
          ) : null
        }
      />

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border font-normal shadow-none",
                sessionTypePillClass(config, session.session_type),
              )}
            >
              {sessionTypeLabel}
            </Badge>
          </div>
          <div className="space-y-3">
            <h1 className={cn("text-4xl font-bold", session.status === SESSION_STATUS.cancelled ? "text-muted-foreground line-through" : "text-foreground")}>
              {session.title || formatDate(session.date, "long", true)}
            </h1>
            {isAdmin && session.status !== SESSION_STATUS.cancelled && (
              <div className="flex items-center gap-2">
                <SessionDialog
                  sport={sport}
                  session={session}
                />
                <CancelSessionButton sport={sport} sessionId={session.id} variant="full" />
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-12 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Location</span>
                {session.location_maps_link ? (
                  <a
                    href={session.location_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground underline underline-offset-2 hover:text-foreground"
                  >
                    {session.location_name}
                    <br />
                    {session.location_address}
                  </a>
                ) : (
                  <>
                    <span className="text-muted-foreground">
                      {session.location_name}
                    </span>
                    <span className="text-muted-foreground">
                      {session.location_address}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Date</span>
                <span className="text-muted-foreground">{formatDate(session.date, "long", true)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Time</span>
                <span className="text-muted-foreground">
                  {formatTime(session.time_start)} –{" "}
                  {formatTime(session.time_end)}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-2 sm:mt-0">
            <div className="flex items-start gap-2">
              <UserStar className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium text-foreground">Leaders</span>
                <span className="text-muted-foreground">{config.organizers}</span>
              </div>
            </div>
            {session.signup_open && session.signup_close && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="font-medium text-foreground">
                    Sign-ups open from
                  </span>
                  <span className="text-muted-foreground">
                    <LocalTimestamp date={session.signup_open} weekday="long" />
                  </span>
                  <span className="text-muted-foreground">
                    <LocalTimestamp date={session.signup_close} weekday="long" />
                  </span>
                </div>
              </div>
            )}
            {session.signup_open && session.signup_close && (
              <CountdownTimer
                openTime={session.signup_open}
                closeTime={session.signup_close}
                isFormOpen={isOpen}
              />
            )}
          </div>
        </div>
      </div>

      {session.notes && (
        <div className="text-sm text-muted-foreground whitespace-pre-line">
          <p>{session.notes}</p>
        </div>
      )}

      {session.status === SESSION_STATUS.cancelled && (
        <StatusBanner
          variant="destructive"
          icon={<Ban className="h-5 w-5 text-destructive shrink-0 mt-0.5" />}
          title="Session cancelled"
          message={<>{session.status_notes && <>{session.status_notes}{session.status_notes.endsWith(".") ? " " : ". "}</>}You can no longer sign up for this session.</>}
        >
          {isAdmin && (
            <RestoreSessionButton sport={sport} sessionId={session.id} variant="full" />
          )}
        </StatusBanner>
      )}

      <Suspense fallback={<LoadingContent />}>
        <SessionSignupsContent
          sessionId={session.id}
          sport={sport}
          user={user}
          isOpen={isOpen}
          userRole={userRole}
          signupRole={tab.permissions[AccessLevel.signup]}
          playerCap={session.player_cap}
          viewData={(session.alt_session_views as Record<string, StoredViewInstance>) ?? {}}
          isAdmin={isAdmin}
        />
      </Suspense>
    </div>
  );
}
