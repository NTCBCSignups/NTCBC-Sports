import { notFound } from "next/navigation";
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
  ArrowLeft,
  Settings,
} from "lucide-react";
import AuthButton from "@/components/sports/auth-button";
import SignupButton from "@/components/softball/signup-button";
import SignInPrompt from "@/components/softball/sign-in-prompt";
import { isSignupOpen } from "@/lib/signup-capacity";
import SignupSummaryHeader from "@/components/softball/signup-summary-header";
import StatusBadge from "@/components/status-badge";
import CountdownTimer from "@/components/countdown-timer";
import LocalTimestamp from "@/components/local-timestamp";
import { Button } from "@/components/ui/button";
import { sportsConfig } from "@/lib/sports-config";
import { formatDate, formatTime, displayName } from "@/lib/format";
import type { Profile, SignupStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SPORT = "softball";

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const sportConfig = sportsConfig[SPORT];

  // Middleware validates the JWT and forwards the user via request header.
  const user = sportConfig?.authEnabled ? await getUser() : null;

  if (sportConfig?.authEnabled && !user) {
    return <SignInPrompt sport={SPORT} />;
  }

  // Run session, signups, and user-specific queries in parallel
  const sessionPromise = supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single()
    .then((r) => r);

  const signupsPromise = supabase
    .from("signups")
    .select("*, profiles(full_name, email)")
    .eq("session_id", id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true })
    .then((r) => r);

  let isAdmin = false;
  let isTeamMember = !sportConfig?.restrictedAccessEnabled;
  let userSignupStatus: SignupStatus | null = null;

  const [sessionResult, signupsResult, ...userResults] = await Promise.all([
    sessionPromise,
    signupsPromise,
    ...(user
      ? [
        getUserSportRole(supabase, user.id, SPORT),
        supabase
          .from("signups")
          .select("status")
          .eq("session_id", id)
          .eq("user_id", user.id)
          .neq("status", "cancelled")
          .single()
          .then((r) => r),
      ]
      : []),
  ]);

  if (!sessionResult.data) notFound();
  const session = sessionResult.data;
  const allSignups = signupsResult.data ?? [];

  if (user && userResults.length === 2) {
    const roleResult = userResults[0] as Awaited<
      ReturnType<typeof getUserSportRole>
    >;
    const userSignupResult = userResults[1] as {
      data: { status: string } | null;
    };
    ({ isAdmin, isTeamMember } = roleResult);
    userSignupStatus =
      (userSignupResult.data?.status as SignupStatus) ?? null;
  }

  const confirmedSignups = allSignups.filter((s) => s.status === "confirmed");
  const waitlistedSignups = allSignups.filter((s) => s.status === "waitlisted");

  const isOpen = isSignupOpen(session);

  const isEligible = sportConfig?.restrictedAccessEnabled
    ? session.session_type === "drop_in_practice" || isTeamMember
    : true;

  const sessionTypeLabel =
    session.session_type === "scheduled_game"
      ? "Scheduled Game"
      : "Drop-in Practice";

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/${SPORT}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to {sportConfig?.name ?? "Softball"}
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href={`/${SPORT}/admin`}>
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          {sportConfig?.authEnabled && <AuthButton user={user} sport={session.sport} />}
        </div>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{sessionTypeLabel}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {session.title || formatDate(session.date, "long")}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-12 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Date</span>
                <span className="text-gray-700">{formatDate(session.date, "long")}</span>
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
        <div className="text-sm text-gray-700">
          <p>{session.notes}</p>
        </div>
      )}

      {user ? (
        <SignupButton
          sessionId={session.id}
          isOpen={isOpen}
          userSignupStatus={userSignupStatus}
          isEligible={!!isEligible}
        />
      ) : (
        <p className="text-sm text-gray-500">Sign in to sign up for this session.</p>
      )}

      <div className="space-y-2">
        <h2 className="font-semibold text-gray-900">Attendance</h2>
        <div className="overflow-hidden rounded-lg border bg-white">
          <SignupSummaryHeader
            confirmedCount={confirmedSignups.length}
            waitlistedCount={waitlistedSignups.length}
            playerCap={session.player_cap}
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
                  <TableHead>Name</TableHead>
                  <TableHead>Signed up</TableHead>
                  <TableHead className="sticky right-0 bg-muted/50 border-l">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allSignups.map((signup, index) => {
                  const p = signup.profiles as unknown as Profile | null;
                  return (
                    <TableRow key={signup.id}>
                      <TableCell className="font-mono text-xs">
                        {index + 1}
                      </TableCell>
                      <TableCell>
                        {displayName(p)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <LocalTimestamp date={signup.created_at} />
                      </TableCell>
                      <TableCell className="sticky right-0 bg-white border-l">
                        <StatusBadge status={signup.status as "confirmed" | "waitlisted"} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}
