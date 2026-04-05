import { redirect } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react";
import SessionForm from "@/components/sports/session-form";
import AdminSessionSignups from "@/components/sports/admin-session-signups";
import AdminAccessRequests from "@/components/sports/admin-access-requests";
import DeleteSessionButton from "@/components/sports/delete-session-button";
import AdminSidebar from "@/components/sports/admin-sidebar";
import CcsaSyncButton from "@/components/sports/ccsa-sync-button";
import type {
  Profile,
  SignupStatus,
  AccessRequestStatus,
} from "@/lib/supabase/types";

export const dynamic = "force-dynamic";

const SPORT = "softball";

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
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

function SessionAccordion({
  sessions,
  signupsBySession,
  muted,
}: {
  sessions: Record<string, unknown>[];
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
      {sessions.map((session: Record<string, unknown>) => {
        const sessionSignups =
          signupsBySession.get(session.id as string) ?? [];
        const activeCount = sessionSignups.filter(
          (s) => s.status !== "cancelled",
        ).length;
        return (
          <AccordionItem
            key={session.id as string}
            value={session.id as string}
            className="!border-b rounded-lg border bg-white px-4"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex flex-1 items-center justify-between pr-4">
                <div className="flex items-center gap-3 text-left">
                  <div>
                    <div
                      className={`font-medium ${muted ? "text-gray-500" : ""}`}
                    >
                      {(session.title as string) ||
                        formatDate(session.date as string)}
                    </div>
                    <div
                      className={`text-xs flex items-center gap-3 mt-0.5 ${muted ? "text-gray-400" : "text-gray-500"}`}
                    >
                      <span className="flex items-center gap-1">
                        <CalendarDays className="h-3 w-3" />
                        {formatDate(session.date as string)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location_name as string}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {(session.session_type as string) === "scheduled_game"
                      ? "Game"
                      : "Practice"}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {activeCount}
                    {(session.player_cap as number | null)
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
                    {formatTime(session.time_start as string)} –{" "}
                    {formatTime(session.time_end as string)} ·{" "}
                    {session.location_address as string}
                  </div>
                  <DeleteSessionButton sessionId={session.id as string} />
                </div>
                <AdminSessionSignups
                  sessionId={session.id as string}
                  signups={sessionSignups}
                  playerCap={session.player_cap as number | null}
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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`/${SPORT}`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let isAdmin = profile?.role === "admin";

  if (!isAdmin) {
    const { data: sportRole } = await supabase
      .from("sport_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("sport", SPORT)
      .single();
    isAdmin = sportRole?.role === "admin";
  }

  if (!isAdmin) redirect(`/${SPORT}`);

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*")
    .eq("sport", SPORT)
    .order("date", { ascending: false });

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

  const { data: accessRequests } = await supabase
    .from("team_access_requests")
    .select(
      "*, profiles!team_access_requests_user_id_fkey(id, email, full_name, avatar_url, role, created_at, updated_at)",
    )
    .eq("sport", SPORT)
    .order("created_at", { ascending: false });

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

          {tab === "ccsa" && (
            <section className="space-y-3">
              <h2 className="text-lg font-semibold text-gray-900">
                CCSA Sync
              </h2>
              <div className="rounded-lg border bg-white p-6">
                <CcsaSyncButton lastSyncedAt={lastSync?.synced_at ?? null} />
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
