import { redirect } from "next/navigation";
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
import { CalendarDays, MapPin } from "lucide-react";
import PageHeader from "@/components/sports/page-header";
import SessionForm from "@/components/sports/session-form";
import { sportsConfig } from "@/config/sports-config";
import AdminSessionSignups from "@/components/sports/admin-session-signups";
import AdminAccessRequests from "@/components/sports/admin-access-requests";
import DeleteSessionButton from "@/components/sports/delete-session-button";
import AdminSidebar from "@/components/sports/admin-sidebar";
import { getAdminTabComponent } from "@/config/admin-tab-registry";
import { formatDate, formatTime } from "@/lib/format";
import type {
  Profile,
  SportSession,
  SignupStatus,
  AccessRequestStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

function SessionAccordion({
  sport,
  sessions,
  signupsBySession,
  teamMemberIds,
  muted,
}: {
  sport: string;
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
                  <DeleteSessionButton sport={sport} sessionId={session.id} />
                </div>
                <AdminSessionSignups
                  sport={sport}
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

const sport = "softball";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const config = sportsConfig[sport]!;

  const { tab = "upcoming" } = await searchParams;
  const supabase = await createClient();
  // Middleware validates the JWT and forwards the user via request header.
  const user = await getUser();

  if (!user) redirect(`/${sport}`);

  const { isAdmin } = await getUserSportRole(supabase, user.id, sport);
  if (!isAdmin) redirect(`/${sport}`);

  // ── Fetch sessions & access requests in parallel ───────────────
  const [{ data: sessions }, { data: accessRequests }] = await Promise.all([
    supabase
      .from("sessions")
      .select("*")
      .eq("sport", sport)
      .order("date", { ascending: false }),
    supabase
      .from("team_access_requests")
      .select(
        "*, profiles!team_access_requests_user_id_fkey(id, email, full_name, avatar_url, role, created_at, updated_at)",
      )
      .eq("sport", sport)
      .order("created_at", { ascending: false }),
  ]);

  // ── Fetch signups + team members in parallel ───────────────────
  const sessionIds = (sessions ?? []).map((s) => s.id);

  const [{ data: allSignups }, { data: teamMembers }] = await Promise.all([
    sessionIds.length
      ? supabase
        .from("signups")
        .select(
          "*, profiles(id, email, full_name, avatar_url, role, created_at, updated_at)",
        )
        .in("session_id", sessionIds)
        .order("created_at", { ascending: true })
      : Promise.resolve({ data: null }),
    supabase
      .from("sport_roles")
      .select("user_id")
      .eq("sport", sport)
      .eq("is_team_member", true),
  ]);

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

  const teamMemberIds = new Set((teamMembers ?? []).map((m) => m.user_id));

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = (sessions ?? []).filter((s) => s.date >= today);
  const pastSessions = (sessions ?? []).filter((s) => s.date < today);

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto mb-12 space-y-6">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />

      <h1 className="text-3xl font-bold text-gray-900">{config.name} Admin</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense>
          <AdminSidebar pendingRequestCount={pendingRequests.length} extraTabs={config.adminTabs} />
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
              <AdminAccessRequests sport={sport} requests={formattedRequests} />
            </section>
          )}

          {tab === "create" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Create Session
              </h2>
              <div className="rounded-lg border bg-white p-6">
                <SessionForm sport={sport} />
              </div>
            </section>
          )}

          {tab === "upcoming" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Upcoming Sessions ({upcomingSessions.length})
              </h2>
              <SessionAccordion
                sport={sport}
                sessions={upcomingSessions}
                signupsBySession={signupsBySession}
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
                sport={sport}
                sessions={pastSessions}
                signupsBySession={signupsBySession}
                teamMemberIds={teamMemberIds}
                muted
              />
            </section>
          )}

          {config.adminTabs?.map((adminTab) => {
            if (tab !== adminTab.id) return null;
            const TabComponent = getAdminTabComponent(adminTab.id);
            if (!TabComponent) return null;
            return <TabComponent key={adminTab.id} sport={sport} />;
          })}
        </div>
      </div>
    </div>
  );
}
