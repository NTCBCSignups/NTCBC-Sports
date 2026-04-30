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

export const dynamic = "force-dynamic";

const sport = "softball";

export default async function SportAuthPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; highlight?: string }>;
}) {
  const config = sportsConfig[sport]!;

  const { tab, highlight } = await searchParams;
  const supabase = await createClient();

  // ── Auth ───────────────────────────────────────────────────────
  // Middleware validates the JWT and forwards the user via request header.
  const user = config.authEnabled ? await getUser() : null;

  if (config.authEnabled && !user) {
    return <SignInPrompt sport={sport} />;
  }

  // ── Roles, access & sessions (parallel) ─────────────────────────
  const queryClient = user ? supabase : createAdminClient();

  const [roleResult, sessionsResult] = await Promise.all([
    user
      ? getUserSportRole(supabase, user.id, sport)
      : Promise.resolve({ isAdmin: false, isTeamMember: true }),
    queryClient
      .from("sessions")
      .select("*, signups(count)")
      .eq("sport", sport)
      .neq("signups.status", "cancelled")
      .gte("date", new Date().toISOString().split("T")[0])
      .order("date", { ascending: true }),
  ]);

  const { isAdmin, isTeamMember } = roleResult;
  const { data: sessions } = sessionsResult;
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  if (user && hasRestrictedAccess(config) && !isTeamMember) {
    const { data: request } = await supabase
      .from("team_access_requests")
      .select("status")
      .eq("user_id", user.id)
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
    user && sessionIds.length > 0
      ? await supabase
        .from("signups")
        .select("session_id, status")
        .eq("user_id", user.id)
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

  const adminButton = isAdmin ? (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href={`/${sport}/admin`}>
        <Settings className="h-4 w-4" />
        Admin
      </Link>
    </Button>
  ) : null;

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
    <SportPageShell
      user={user}
      sport={sport}
      actions={adminButton}
    >
      <SessionTabs
        defaultTab={defaultTab}
        tabs={tabsWithContent}
      />

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
