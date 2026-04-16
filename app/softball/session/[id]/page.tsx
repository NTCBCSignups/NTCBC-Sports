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
} from "lucide-react";
import AuthButton from "@/components/sports/auth-button";
import SignupButton from "@/components/softball/signup-button";
import SignInPrompt from "@/components/softball/sign-in-prompt";
import CountdownTimer from "@/components/countdown-timer";
import LocalTimestamp from "@/components/local-timestamp";
import { sportsConfig } from "@/lib/sports-config";
import type { Profile, SignupStatus } from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

export default async function SessionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const sportConfig = sportsConfig["softball"];

  // Middleware validates the JWT and forwards the user via request header.
  const user = sportConfig?.authEnabled ? await getUser() : null;

  if (sportConfig?.authEnabled && !user) {
    return <SignInPrompt sport="softball" />;
  }

  const { data: session } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .single();

  if (!session) notFound();

  // Run user-role queries and the public signups query in parallel
  const signupsPromise = supabase
    .from("signups")
    .select("*, profiles(full_name, email)")
    .eq("session_id", id)
    .neq("status", "cancelled")
    .order("created_at", { ascending: true });

  let isAdmin = false;
  let isTeamMember = !sportConfig?.restrictedAccessEnabled;
  let userSignupStatus: SignupStatus | null = null;

  if (user) {
    const [roleResult, userSignupResult] = await Promise.all([
      getUserSportRole(supabase, user.id, session.sport),
      supabase
        .from("signups")
        .select("status")
        .eq("session_id", id)
        .eq("user_id", user.id)
        .neq("status", "cancelled")
        .single(),
    ]);

    ({ isAdmin, isTeamMember } = roleResult);
    userSignupStatus =
      (userSignupResult.data?.status as SignupStatus) ?? null;
  }

  const { data: signups } = await signupsPromise;

  const allSignups = signups ?? [];
  const confirmedSignups = allSignups.filter((s) => s.status === "confirmed");
  const waitlistedSignups = allSignups.filter((s) => s.status === "waitlisted");

  const now = new Date();
  const isOpen =
    now >= new Date(session.signup_open) &&
    now <= new Date(session.signup_close);

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
          href="/softball"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Softball
        </Link>
        {sportConfig?.authEnabled && <AuthButton user={user} sport={session.sport} />}
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{sessionTypeLabel}</Badge>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {session.title || formatDate(session.date)}
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row sm:gap-12 text-sm">
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <CalendarDays className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
              <div className="flex flex-col">
                <span className="font-medium text-gray-900">Date</span>
                <span className="text-gray-700">{formatDate(session.date)}</span>
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
            <CountdownTimer
              openTime={session.signup_open}
              closeTime={session.signup_close}
              isFormOpen={isOpen}
            />
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
          <div className="flex border-b">
            <div className="flex-1 px-4 py-3 border-r">
              <p className="text-xs text-muted-foreground mb-0.5">Capacity</p>
              <p
                className={`text-sm font-semibold ${session.player_cap && allSignups.length > session.player_cap ? "text-amber-600" : "text-gray-900"}`}
              >
                {confirmedSignups.length}{session.player_cap ? ` / ${session.player_cap}` : ""}
              </p>
            </div>
            <div className="flex-1 px-4 py-3">
              <p className="text-xs text-muted-foreground mb-0.5">Waitlist</p>
              <p className="text-sm font-semibold text-gray-900">
                {waitlistedSignups.length}
              </p>
            </div>
          </div>

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
                        {p?.full_name ?? p?.email ?? "Unknown"}
                      </TableCell>
                      <TableCell className="text-xs">
                        <LocalTimestamp date={signup.created_at} />
                      </TableCell>
                      <TableCell className="sticky right-0 bg-white border-l">
                        {signup.status === "confirmed" ? (
                          <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-100">
                            Confirmed
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100">
                            Waitlist
                          </Badge>
                        )}
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
