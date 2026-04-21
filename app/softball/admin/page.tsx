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
import { formatDate, formatTime } from "@/lib/format";
import type {
  Profile,
  SportSession,
  SignupStatus,
  AccessRequestStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SPORT = "softball";

function SessionAccordion({
  sessions,
  signupsBySession,
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

  const today = new Date().toISOString().split("T")[0];
  const upcomingSessions = (sessions ?? []).filter((s) => s.date >= today);
  const pastSessions = (sessions ?? []).filter((s) => s.date < today);

  return (
    <div className="max-w-5xl mx-auto mb-12 space-y-6">
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
                muted
              />
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
