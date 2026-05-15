import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Badge } from "@/components/ui/badge";
import {
  CalendarDays,
  Clock,
  MapPin,
  Settings,
  UserStar,
} from "lucide-react";
import PageHeader from "@/components/sports/page-header";
import AuthButton from "@/components/sports/auth-button";
import SignupButton from "@/components/sports/signup-button";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import SignInToSignupBanner from "@/components/sports/sign-in-to-signup-banner";
import { isSignupOpen } from "@/lib/signup-capacity";
import SessionSignupsTable from "@/components/sports/session-signups-table";
import CountdownTimer from "@/components/sports/countdown-timer";
import LocalTimestamp from "@/components/sports/local-timestamp";
import { Button } from "@/components/ui/button";
import { sportsConfig, getTabPermissions, Role, AccessLevel } from "@/config/sports-config";
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

async function SessionSignupsContent({
  sessionId,
  sport,
  user,
  isOpen,
  userRole,
  signupRole,
  playerCap,
}: {
  sessionId: string;
  sport: string;
  user: User | null;
  isOpen: boolean;
  userRole: Role;
  signupRole: Role;
  playerCap: number | null;
}) {
  const userId = user?.id ?? null;
  const canSignup = userRole >= signupRole;
  const needsTeamAccess = signupRole >= Role.teamUser && userRole < Role.teamUser && userRole >= Role.user;

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
        {userRole === Role.anon && signupRole >= Role.user && (
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
        <h2 className="font-semibold text-gray-900">Attendance</h2>
        <SessionSignupsTable
          signups={rawSignups}
          teamMemberIds={teamMemberIds}
          playerCap={playerCap}
          currentUserId={userId}
          showTimestamp
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
  const config = sportsConfig[sport];
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
  const permissions = getTabPermissions(config, session?.session_type ?? "");
  const userRole = user
    ? roleResult.role
    : Role.anon;

  if (!session || userRole < permissions[AccessLevel.view]) {
    redirect(`/${sport}`);
  }

  const isAdmin = userRole >= Role.admin;

  const sessionTab = config.tabs?.find((t) => t.value === session.session_type);
  const isOpen = isSignupOpen(session);
  const sessionTypeLabel = sessionTab?.label ?? session.session_type;
  const backParams = new URLSearchParams({ session: id });
  if (fromTab) backParams.set("tab", fromTab);

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <PageHeader
        backHref={`/${sport}?${backParams.toString()}`}
        backLabel={`Back to ${config.name}`}
        actions={
          <>
            {isAdmin && (
              <Button asChild variant="outline" size="sm" className="rounded-full">
                <Link href={`/${sport}/admin`}>
                  <Settings className="h-4 w-4" />
                  Admin
                </Link>
              </Button>
            )}
            {config.authEnabled && <AuthButton user={user} sport={session.sport} />}
          </>
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
          <h1 className="text-4xl font-bold text-gray-900">
            {session.title || formatDate(session.date, "long", true)}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-12 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Location</span>
                {session.location_maps_link ? (
                  <a
                    href={session.location_maps_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-700 underline underline-offset-2 hover:text-gray-900"
                  >
                    {session.location_name}
                    <br />
                    {session.location_address}
                  </a>
                ) : (
                  <>
                    <span className="text-gray-700">
                      {session.location_name}
                    </span>
                    <span className="text-gray-700">
                      {session.location_address}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Date</span>
                <span className="text-gray-700">{formatDate(session.date, "long", true)}</span>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Time</span>
                <span className="text-gray-700">
                  {formatTime(session.time_start)} –{" "}
                  {formatTime(session.time_end)}
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2 mt-2 sm:mt-0">
            <div className="flex items-start gap-2">
              <UserStar className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Leaders</span>
                <span className="text-gray-700">{config.organizers}</span>
              </div>
            </div>
            {session.signup_open && session.signup_close && (
              <div className="flex items-start gap-2">
                <Clock className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
                <div className="flex flex-col">
                  <span className="font-medium text-gray-900">
                    Sign-ups open from
                  </span>
                  <span className="text-gray-700">
                    <LocalTimestamp date={session.signup_open} weekday="long" />
                  </span>
                  <span className="text-gray-700">
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
        <div className="text-sm text-gray-700 whitespace-pre-line">
          <p>{session.notes}</p>
        </div>
      )}

      <Suspense fallback={<LoadingContent />}>
        <SessionSignupsContent
          sessionId={session.id}
          sport={sport}
          user={user}
          isOpen={isOpen}
          userRole={userRole}
          signupRole={permissions[AccessLevel.signup]}
          playerCap={session.player_cap}
        />
      </Suspense>
    </div>
  );
}
