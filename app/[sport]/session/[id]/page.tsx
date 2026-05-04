import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import SignInPrompt from "@/components/sports/sign-in-prompt";
import { isSignupOpen } from "@/lib/signup-capacity";
import SignupSummaryHeader from "@/components/sports/signup-summary-header";
import { TeamMemberBadge, StatusBadge } from "@/components/sports/badges";
import CountdownTimer from "@/components/sports/countdown-timer";
import LocalTimestamp from "@/components/sports/local-timestamp";
import { Button } from "@/components/ui/button";
import { sportsConfig } from "@/config/sports-config";
import { formatDate, formatTime, displayName } from "@/lib/format";
import { LoadingContent } from "@/components/sports/loading-content";
import {
  getSession,
  getSessionSignups,
  getTeamMembers,
  getUserSignupStatus,
} from "@/lib/get-data";

async function SessionSignupsContent({
  sessionId,
  sport,
  userId,
  isOpen,
  isEligible,
  playerCap,
}: {
  sessionId: string;
  sport: string;
  userId: string;
  isOpen: boolean;
  isEligible: boolean;
  playerCap: number | null;
}) {
  const [rawSignups, teamMemberIds, userSignupStatus] = await Promise.all([
    getSessionSignups(sessionId),
    getTeamMembers(sport),
    getUserSignupStatus(userId, sessionId),
  ]);

  const allSignups = rawSignups.filter((s) => s.status !== "cancelled");

  const confirmedSignups = allSignups.filter((s) => s.status === "confirmed");
  const waitlistedSignups = allSignups.filter((s) => s.status === "waitlisted");
  const activeSignups = allSignups.filter((s) => s.status !== "declined");
  const declinedSignups = allSignups.filter((s) => s.status === "declined");
  const sortedSignups = [...activeSignups, ...declinedSignups];

  return (
    <>
      <SignupButton
        sessionId={sessionId}
        isOpen={isOpen}
        userSignupStatus={userSignupStatus}
        isEligible={isEligible}
        showStatusText={false}
      />

      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900">Attendance</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <SignupSummaryHeader
            confirmedCount={confirmedSignups.length}
            waitlistedCount={waitlistedSignups.length}
            playerCap={playerCap}
          />

          {allSignups.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No sign-ups yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-12">#</TableHead>
                  <TableHead className="w-8 px-1"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead className="sticky right-0 bg-muted/50 border-l">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(() => {
                  let activeIndex = 0;
                  let declinedIndex = 0;
                  return sortedSignups.map((signup) => {
                  const p = signup.profiles;
                  const isCurrentUser = userId === signup.user_id;
                  const isDeclined = signup.status === "declined";
                  const groupIndex = isDeclined ? ++declinedIndex : ++activeIndex;
                  return (
                    <TableRow key={signup.id} className={`group ${isCurrentUser ? "bg-blue-50" : ""}`}>
                      <TableCell className="font-mono text-xs">
                        {groupIndex}
                      </TableCell>
                      <TableCell className="px-1 align-middle">
                        {teamMemberIds.has(signup.user_id) && <TeamMemberBadge />}
                      </TableCell>
                      <TableCell>
                        {displayName(p)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <LocalTimestamp date={signup.created_at} />
                      </TableCell>
                      <TableCell className={`sticky right-0 border-l group-hover:bg-muted/50 ${isCurrentUser ? "bg-blue-50" : "bg-white"}`}>
                        <StatusBadge status={signup.status as "confirmed" | "waitlisted" | "declined"} />
                      </TableCell>
                    </TableRow>
                  );
                  });
                })()}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ sport: string; id: string }>;
}) {
  const { sport, id } = await params;
  const config = sportsConfig[sport];
  if (!config) notFound();

  const supabase = await createClient();

  // Middleware validates the JWT and forwards the user via request header.
  const user = await getUser();

  if (!user) {
    return <SignInPrompt sport={sport} />;
  }

  // ── Fetch cached session + role first to gate access before loading sensitive data ──
  const [session, roleResult] = await Promise.all([
    getSession(id),
    getUserSportRole(supabase, user.id, sport),
  ]);

  if (!session) notFound();
  const { isAdmin, isTeamMember } = roleResult;

  // Block non-team members from tabs with restricted access
  const sessionTab = config.tabs?.find((t) => t.value === session.session_type);
  if (sessionTab?.restrictedAccess && !isTeamMember) {
    redirect(`/${sport}?tab=${session.session_type}&highlight=${id}`);
  }

  const isOpen = isSignupOpen(session);
  const isEligible = sessionTab?.restrictedAccess ? isTeamMember : true;
  const sessionTypeLabel = sessionTab?.label ?? session.session_type;

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <PageHeader
        backHref={`/${sport}?tab=${session.session_type}`}
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
            <Badge variant="secondary">{sessionTypeLabel}</Badge>
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
          userId={user.id}
          isOpen={isOpen}
          isEligible={!!isEligible}
          playerCap={session.player_cap}
        />
      </Suspense>
    </div>
  );
}
