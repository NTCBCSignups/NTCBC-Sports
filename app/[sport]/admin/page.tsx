import { notFound, redirect } from "next/navigation";
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
import {
  resolvedSportsConfig,
  getResolvedTab,
  Role,
  type ResolvedSportConfig,
} from "@/config/config-resolver";
import AdminSessionSignups from "@/components/sports/admin-session-signups";
import AdminAccessRequests from "@/components/sports/admin-access-requests";
import DeleteSessionButton from "@/components/sports/delete-session-button";
import AdminSidebar from "@/components/sports/admin-sidebar";
import { getAdminTabComponent } from "@/config/admin-tab-registry";
import { formatDate, formatTime } from "@/lib/format";
import { getTodayInSportTimezone } from "@/lib/timezone";
import { sessionTypePillClass } from "@/lib/session-type-pill";
import { cn } from "@/lib/utils";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import {
  getAllSessions,
  getAccessRequests,
  getSessionSignups,
  getTeamMembers,
} from "@/lib/get-data";
import type {
  Profile,
  SportSession,
  SignupStatus,
  AccessRequestStatus,
} from "@/lib/supabase/types";

function SessionAccordion({
  config,
  sport,
  sessions,
  signupsBySession,
  teamMemberIds,
  muted,
}: {
  config: ResolvedSportConfig;
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
      <p className="text-sm text-muted-foreground py-4">No sessions.</p>
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
        const tab = getResolvedTab(config, session.session_type);
        const sessionTypeLabel =
          tab.defaultTitlePrefix ?? tab.label;

        return (
          <AccordionItem
            key={session.id}
            value={session.id}
            className="border-b! rounded-lg border bg-card px-4"
          >
            <AccordionTrigger className="hover:no-underline py-3">
              <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pr-2 sm:items-center sm:pr-4">
                <div className="min-w-0 flex-1 text-left">
                  <div
                    className={`truncate text-base font-medium sm:text-sm ${muted ? "text-muted-foreground" : ""}`}
                  >
                    {session.title || formatDate(session.date)}
                  </div>
                  <div
                    className={`mt-1 flex min-w-0 items-center gap-4 text-sm sm:gap-6 sm:text-xs ${muted ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                  >
                    <span className="flex shrink-0 items-center gap-2 sm:gap-1">
                      <CalendarDays className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
                      {formatDate(session.date)}
                    </span>
                    <span className="flex min-w-0 items-center gap-2 sm:gap-1">
                      <MapPin className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
                      <span className="truncate">{session.location_name}</span>
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "rounded-full border text-xs font-normal shadow-none",
                      sessionTypePillClass(config, session.session_type),
                    )}
                  >
                    {sessionTypeLabel}
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
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 text-sm text-muted-foreground">
                    {formatTime(session.time_start)} –{" "}
                    {formatTime(session.time_end)} ·{" "}
                    {session.location_address}
                  </div>
                  <div className="shrink-0 -mt-1">
                    <DeleteSessionButton sport={sport} sessionId={session.id} />
                  </div>
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

async function AdminDataContent({
  sport,
  tab,
}: {
  sport: string;
  tab: string;
}) {
  const config = resolvedSportsConfig[sport];

  // ── Fetch cached data in parallel ──────────────────────────────
  const [sessions, accessRequests, teamMemberIds] = await Promise.all([
    getAllSessions(sport),
    getAccessRequests(sport),
    getTeamMembers(sport),
  ]);

  // ── Fetch signups for all sessions in parallel ─────────────────
  const allSignupArrays = await Promise.all(
    sessions.map((s) => getSessionSignups(s.id)),
  );

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
  for (let i = 0; i < sessions.length; i++) {
    const sessionId = sessions[i].id;
    signupsBySession.set(
      sessionId,
      (allSignupArrays[i] ?? []).map((signup) => ({
        id: signup.id,
        user_id: signup.user_id,
        status: signup.status as SignupStatus,
        created_at: signup.created_at,
        profiles: signup.profiles,
      })),
    );
  }

  const formattedRequests = accessRequests.map((r) => ({
    id: r.id,
    user_id: r.user_id,
    status: r.status as AccessRequestStatus,
    created_at: r.created_at,
    profiles: r.profiles,
  }));

  const pendingRequests = formattedRequests.filter(
    (r) => r.status === "pending",
  );

  const today = getTodayInSportTimezone();
  const upcomingSessions = sessions
    .filter((s) => s.date >= today)
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.time_start.localeCompare(b.time_start);
    });
  const pastSessions = sessions.filter((s) => s.date < today);

  return (
    <>
      <Suspense>
        <AdminSidebar pendingRequestCount={pendingRequests.length} extraTabs={config.adminTabs} />
      </Suspense>

      <div className="flex-1 min-w-0">
        {tab === "requests" && (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-foreground">
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
            <h2 className="text-lg font-semibold text-foreground">
              Create Session
            </h2>
            <div className="rounded-lg border bg-card p-6">
              <SessionForm sport={sport} />
            </div>
          </section>
        )}

        {tab === "upcoming" && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Upcoming Sessions ({upcomingSessions.length})
            </h2>
            <SessionAccordion
              config={config}
              sport={sport}
              sessions={upcomingSessions}
              signupsBySession={signupsBySession}
              teamMemberIds={teamMemberIds}
            />
          </section>
        )}

        {tab === "past" && (
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground">
              Past Sessions ({pastSessions.length})
            </h2>
            <SessionAccordion
              config={config}
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
          return (
            <Suspense key={adminTab.id} fallback={<LoadingAdminContent />}>
              <TabComponent sport={sport} />
            </Suspense>
          );
        })}
      </div>
    </>
  );
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { sport } = await params;
  const config = resolvedSportsConfig[sport];
  if (!config) notFound();

  const { tab = "upcoming" } = await searchParams;
  const supabase = await createClient();
  // Middleware validates the JWT and forwards the user via request header.
  const user = await getUser();

  if (!user) redirect(`/${sport}`);

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (role < Role.admin) redirect(`/${sport}`);

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto mb-12 space-y-6">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />

      <h1 className="text-3xl font-bold text-foreground">{config.name} Admin</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense fallback={<LoadingAdminContent />}>
          <AdminDataContent sport={sport} tab={tab} />
        </Suspense>
      </div>
    </div>
  );
}
