import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Settings } from "lucide-react";
import SessionCard from "@/components/sports/session-card";
import SessionTabs from "@/components/sports/session-tabs";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import SignInPrompt from "@/components/sports/sign-in-prompt";
import SportPageShell from "@/components/sports/sport-page-shell";
import { Button } from "@/components/ui/button";
import { sportsConfig, hasRestrictedAccess } from "@/config/sports-config";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTodayInSportTimezone } from "@/lib/timezone";
import { LoadingContent } from "@/components/sports/loading-content";

export const dynamic = "force-dynamic";

async function SportSessionsContent({
  sport,
  tab,
  highlight,
  userId,
}: {
  sport: string;
  tab?: string;
  highlight?: string;
  userId: string | null;
}) {
  const config = sportsConfig[sport];
  const supabase = await createClient();

  // ── Roles, access & sessions (parallel) ─────────────────────────
  const queryClient = userId ? supabase : createAdminClient();

  const [roleResult, sessionsResult] = await Promise.all([
    userId
      ? getUserSportRole(supabase, userId, sport)
      : Promise.resolve({ isAdmin: false, isTeamMember: true }),
    queryClient
      .from("sessions")
      .select("*, signups(count)")
      .eq("sport", sport)
      .neq("signups.status", "cancelled")
      .gte("date", getTodayInSportTimezone())
      .order("date", { ascending: true }),
  ]);

  const { isAdmin, isTeamMember } = roleResult;
  const { data: sessions } = sessionsResult;
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  if (userId && hasRestrictedAccess(config) && !isTeamMember) {
    const { data: request } = await supabase
      .from("team_access_requests")
      .select("status")
      .eq("user_id", userId)
      .eq("sport", sport)
      .single();
    accessRequestStatus = request?.status ?? null;
  }

  const sessionsWithCounts = (sessions ?? []).map((s) => ({
    ...s,
    signup_count:
      (s.signups as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));
  const sessionIds = sessionsWithCounts.map((session) => session.id);
  const { data: userSignups } =
    userId && sessionIds.length > 0
      ? await supabase
        .from("signups")
        .select("session_id, status")
        .eq("user_id", userId)
        .in("session_id", sessionIds)
        .neq("status", "cancelled")
      : { data: [] };
  const userSignupStatusBySession = new Map(
    (userSignups ?? []).map((signup) => [
      signup.session_id,
      signup.status,
    ]),
  );

  const sessionsByType = Object.groupBy(sessionsWithCounts, (s) => s.session_type);

  const configTabs = config.tabs ?? [];
  const defaultTab = configTabs.find((t) => t.value === tab)?.value ?? config.defaultTab ?? configTabs[0]?.value;

  const tabsWithContent = configTabs.map((t) => {
    const sessions = sessionsByType[t.value] ?? [];
    const isRestricted = !!t.restrictedAccess && !isTeamMember;

    return {
      ...t,
      content: (
        <>
          {isRestricted && (
            <TeamAccessBanner
              requestStatus={accessRequestStatus}
              sport={sport}
            />
          )}
          {sessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  linkDisabled={isRestricted}
                  highlighted={session.id === highlight}
                  userSignupStatus={
                    userSignupStatusBySession.get(session.id) ?? null
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No upcoming {t.label.toLowerCase()}.
            </p>
          )}
        </>
      ),
    };
  });

  return (
    <SessionTabs
      defaultTab={defaultTab}
      tabs={tabsWithContent}
    />
  );
}

async function AdminButton({ sport, userId }: { sport: string; userId: string }) {
  const supabase = await createClient();
  const { isAdmin } = await getUserSportRole(supabase, userId, sport);
  if (!isAdmin) return null;
  return (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={`/${sport}/admin`}>
        <Settings className="h-4 w-4" />
        Admin
      </Link>
    </Button>
  );
}

export default async function SportAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ tab?: string; highlight?: string }>;
}) {
  const { sport } = await params;
  const config = sportsConfig[sport];
  if (!config) notFound();

  const { tab, highlight } = await searchParams;

  // ── Auth ───────────────────────────────────────────────────────
  // Middleware validates the JWT and forwards the user via request header.
  const user = config.authEnabled ? await getUser() : null;

  if (config.authEnabled && !user) {
    return <SignInPrompt sport={sport} />;
  }

  return (
    <SportPageShell
      user={user}
      sport={sport}
      actions={
        user ? (
          <Suspense>
            <AdminButton sport={sport} userId={user.id} />
          </Suspense>
        ) : null
      }
    >
      <Suspense fallback={<LoadingContent />}>
        <SportSessionsContent
          sport={sport}
          tab={tab}
          highlight={highlight}
          userId={user?.id ?? null}
        />
      </Suspense>

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">Important Notes</h2>
        <ul className="space-y-2.5 ml-4 text-gray-700">
          {config.notes?.map((note) => (
            <li key={note} className="flex items-start text-sm">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </SportPageShell>
  );
}
