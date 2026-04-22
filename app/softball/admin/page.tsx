import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import SessionForm from "@/components/softball/session-form";
import AdminSessionSignups from "@/components/softball/admin-session-signups";
import AdminAccessRequests from "@/components/softball/admin-access-requests";
import DeleteSessionButton from "@/components/softball/delete-session-button";
import AdminSidebar from "@/components/softball/admin-sidebar";
import CcsaSyncButton from "@/components/sports/ccsa-sync-button";
import { formatDate, formatTime } from "@/lib/format";
import { hasCcsaSession } from "@/app/softball/actions/ccsa-sync";
import type {
  Profile,
  SportSession,
  SignupStatus,
  AccessRequestStatus, WaiverStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SPORT = "softball";

function SessionAccordion({
  sessions,
  signupsBySession,
  waiverByEmail,
  teamMemberIds,
  muted,
}: {
  sessions: SportSession[];
  signupsBySession: Map<
    string,
    {
      id: string;
      user_id: string;
      status: SignupStatus;
      created_at: string;
      profiles: Profile | null;
    }[]
  >;
  waiverByEmail: Map<string, WaiverStatus>;
  teamMemberIds: Set<string>;
  muted?: boolean;
}) {
  if (sessions.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4">No sessions.</p>
    );
  }

  return (
    <Accordion type="multiple" className="space-y-2">
      {sessions.map((session) => {
        const sessionSignups =
          signupsBySession.get(session.id) ?? [];
        const activeCount = sessionSignups.filter(
          (s) => s.status !== "cancelled",
        ).length;
        return (
          <AccordionItem
            key={session.id}
            value={session.id}
            className="!border-b rounded-lg border bg-white px-4"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex flex-1 items-center justify-between pr-4">
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <div
                      className={`font-medium ${muted ? "text-gray-500" : ""}`}
                    >
                      {session.title || formatDate(session.date)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-3 mt-0.5 ${muted ? "text-gray-400" : "text-gray-500"}`}
                    >
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(session.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location_name}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {session.session_type === "scheduled_game"
                      ? "Game"
                      : "Practice"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activeCount}
                    {session.player_cap
                      ? ` / ${session.player_cap}`
                      : ""}
                  </Badge>
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pb-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    {formatTime(session.time_start)} –{" "}
                    {formatTime(session.time_end)} ·{" "}
                    {session.location_address}
                  </div>
                  <DeleteSessionButton sessionId={session.id} />
                </div>
                <AdminSessionSignups
                  sessionId={session.id}
                  signups={sessionSignups}
                  playerCap={session.player_cap}
                  teamMemberIds={teamMemberIds}
                />
              </div>
            </AccordionContent>
          </AccordionItem>
        );
      })}
    </Accordion>
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "upcoming" } = await searchParams;
  const supabase = await createClient();
  // Middleware validates the JWT and forwards the user via request header.
  const user = await getUser();

  if (!user) redirect(`/${SPORT}`);

  const { isAdmin } = await getUserSportRole(supabase, user.id, SPORT);
  if (!isAdmin) redirect(`/${SPORT}`);

  // ── Fetch sessions & access requests in parallel ───────────────
  const [{ data: sessions }, { data: accessRequests }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("sport", SPORT)
      .order("date", { ascending: false }),
    supabase
      .from("team_access_requests")
      .select(
        "*, profiles!team_access_requests_user_id_fkey(id, email, full_name, avatar_url, role, created_at, updated_at)",
      )
      .eq("sport", SPORT)
      .order("created_at", { ascending: false }),
  ]);

  // ── Fetch signups for all sessions ─────────────────────────────
  const sessionIds = (sessions ?? []).map((s) => s.id);

  const { data: allSignups } = sessionIds.length
    ? await supabase
      .from("signups")
      .select(
        "*, profiles(id, email, full_name, avatar_url, role, created_at, updated_at)",
      )
      .in("session_id", sessionIds)
      .order("created_at", { ascending: true })
    : { data: [] };

  const signupsBySession = new Map<
    string,
    {
      id: string;
      user_id: string;
      status: SignupStatus;
      created_at: string;
      profiles: Profile | null;
    }[]
  >();
  for (const signup of allSignups ?? []) {
    const list = signupsBySession.get(signup.session_id) ?? [];
    list.push({
      id: signup.id,
      user_id: signup.user_id,
      status: signup.status as SignupStatus,
      created_at: signup.created_at,
      profiles: signup.profiles as unknown as Profile | null,
    });
    signupsBySession.set(signup.session_id, list);
  }

  const formattedRequests = (accessRequests ?? []).map((r) => ({
    id: r.id,
    user_id: r.user_id,
    status: r.status as AccessRequestStatus,
    created_at: r.created_at,
    profiles: r.profiles as unknown as Profile | null,
  }));

  const pendingRequests = formattedRequests.filter(
    (r) => r.status === "pending",
  );

  const { data: lastSync } = await supabase
    .from("ccsa_players")
    .select("synced_at")
    .order("synced_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: ccsaPlayers } = await supabase
    .from("ccsa_players")
    .select("email, first_name, last_name, waiver_status");

  // Fetch all team members for CCSA matching
  const { data: teamMembers } = await supabase
    .from("sport_roles")
    .select("user_id, is_team_member, profiles!sport_roles_user_id_fkey(full_name, email)")
    .eq("sport", SPORT)
    .eq("is_team_member", true);

  // Fetch all profiles for account-exists detection
  const { data: allProfiles } = await supabase
    .from("profiles")
    .select("full_name, email");

  const ccsaSession = await hasCcsaSession();

  const waiverByEmail = new Map<string, WaiverStatus>();
  for (const cp of ccsaPlayers ?? []) {
    waiverByEmail.set(cp.email, cp.waiver_status as WaiverStatus);
  }

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = (sessions ?? []).filter((s) => s.date >= today);
  const pastSessions = (sessions ?? []).filter((s) => s.date < today);
  const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.user_id));

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto mb-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/${SPORT}`}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Softball
        </Link>
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Softball Admin</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense>
          <AdminSidebar pendingRequestCount={pendingRequests.length} />
        </Suspense>

        <div className="flex-1 min-w-0">
          {tab === "requests" && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-gray-900">
                  Team Access Requests
                </h2>
                {pendingRequests.length > 0 && (
                  <Badge variant="destructive">
                    {pendingRequests.length} pending
                  </Badge>
                )}
              </div>
              <AdminAccessRequests requests={formattedRequests} />
            </section>
          )}

          {tab === "create" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Session
              </h2>
              <div className="rounded-lg border bg-white p-6">
                <SessionForm />
              </div>
            </section>
          )}

          {tab === "upcoming" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming Sessions ({upcomingSessions.length})
              </h2>
              <SessionAccordion
                sessions={upcomingSessions}
                signupsBySession={signupsBySession}
                waiverByEmail={waiverByEmail}
                teamMemberIds={teamMemberIds}
              />
            </section>
          )}

          {tab === "past" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Past Sessions ({pastSessions.length})
              </h2>
              <SessionAccordion
                sessions={pastSessions}
                signupsBySession={signupsBySession}
                waiverByEmail={waiverByEmail}
                teamMemberIds={teamMemberIds}
                muted
              />
            </section>
          )}

          {tab === "ccsa" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                CCSA Sync
              </h2>
              <div className="rounded-lg border bg-white p-6">
                <CcsaSyncButton
                  lastSyncedAt={lastSync?.synced_at ?? null}
                  hasSession={ccsaSession.hasCookies}
                  sessionEmail={ccsaSession.email ?? undefined}
                  initialPlayers={(ccsaPlayers ?? []).map((p) => ({
                    email: p.email,
                    first_name: p.first_name,
                    last_name: p.last_name,
                    waiver_status: p.waiver_status,
                  }))}
                  teamMembers={(teamMembers ?? []).map((m) => ({
                    email: (m.profiles as unknown as { email: string })?.email ?? "",
                    full_name: (m.profiles as unknown as { full_name: string })?.full_name ?? "",
                  }))}
                  allProfiles={(allProfiles ?? []).map((p) => ({
                    email: p.email ?? "",
                    full_name: p.full_name ?? "",
                  }))}
                />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
