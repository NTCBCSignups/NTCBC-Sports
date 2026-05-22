import { Suspense } from "react";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import SessionCard from "@/components/sports/session-card";
import SessionFilter from "@/components/sports/session-filter";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import SignInToSignupBanner from "@/components/sports/sign-in-to-signup-banner";
import SportPageShell from "@/components/sports/sport-page-shell";
import AdminButton from "@/components/sports/admin-button";
import { resolvedSportsConfig, Role, AccessLevel } from "@/config/config-resolver";
import { LoadingContent } from "@/components/sports/loading-content";
import { getUpcomingSessions, getUserAccessRequestStatus, getUserSignupStatuses } from "@/lib/get-data";
import type { SignupStatus, AccessRequestStatus } from "@/lib/supabase/types";

/**
 * Returns the appropriate access gate banner for a tab based on user state.
 * - Anon user → SignInToSignupBanner (with contextual text)
 * - Signed-in user lacking access → TeamAccessBanner (with request button)
 * - User has access → null
 */
function getAccessGateBanner({
  userId,
  userRole,
  requiredViewRole,
  accessRequestStatus,
  sport,
  label,
}: {
  userId: string | null;
  userRole: Role;
  requiredViewRole: Role;
  accessRequestStatus: AccessRequestStatus | null;
  sport: string;
  label: string;
}) {
  if (userRole >= requiredViewRole) return null;

  // Anon user — needs to sign in
  if (!userId) {
    return (
      <SignInToSignupBanner
        title={
          requiredViewRole >= Role.teamUser
            ? "Team members only"
            : `Sign in to view ${label}`
        }
        message={
          requiredViewRole >= Role.teamUser
            ? `Sign in and request team access to view and sign up for ${label}.`
            : `Sign in with your Google account to view and sign up for ${label}.`
        }
      />
    );
  }

  // Signed-in user lacking team access
  return (
    <TeamAccessBanner
      requestStatus={accessRequestStatus}
      sport={sport}
    />
  );
}

async function SportSessionsContent({
  sport,
  tab,
  highlight,
  scrollTo,
  userId,
}: {
  sport: string;
  tab?: string;
  highlight?: string;
  scrollTo?: string;
  userId: string | null;
}) {
  const config = resolvedSportsConfig[sport];
  const supabase = await createClient();

  // ── Roles & sessions (parallel) ────────────────────────────────
  const [roleResult, sessionsWithCounts] = await Promise.all([
    userId
      ? getUserSportRole(supabase, userId, sport)
      : Promise.resolve({ role: Role.anon, isAdmin: false, isTeamMember: false }),
    getUpcomingSessions(sport),
  ]);

  const userRole = roleResult.role;

  const needsAccessRequest = !!userId && config.tabs.some((t) =>
    userRole < t.permissions[AccessLevel.view] || userRole < t.permissions[AccessLevel.signup]
  );

  const sessionIds = sessionsWithCounts.map((session) => session.id);

  const [accessRequestStatus, userSignupStatusBySession] = await Promise.all([
    needsAccessRequest
      ? getUserAccessRequestStatus(userId!, sport)
      : Promise.resolve(null),
    userId
      ? getUserSignupStatuses(userId, sessionIds)
      : Promise.resolve(new Map<string, SignupStatus>()),
  ]);

  const sessionsByType = Object.groupBy(sessionsWithCounts, (s) => s.session_type);

  const configTabs = config.tabs ?? [];
  const showAll = configTabs.length > 1;
  const ALL_VALUE = "all";

  const typeOptions = configTabs.map((t) => {
    const sessions = sessionsByType[t.value] ?? [];
    const canView = userRole >= t.permissions[AccessLevel.view];
    const gateBanner = getAccessGateBanner({
      userId,
      userRole,
      requiredViewRole: t.permissions[AccessLevel.view],
      accessRequestStatus,
      sport,
      label: t.label.toLowerCase(),
    });

    return {
      value: t.value,
      label: t.label,
      content: (
        <div className="space-y-4">
          {gateBanner ? (
            gateBanner
          ) : sessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {sessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  highlighted={session.id === highlight}
                  returnTab={t.value}
                  userRole={userRole}
                  userSignupStatus={
                    userSignupStatusBySession.get(session.id) ?? null
                  }
                />
              ))}
            </div>
          ) : !canView ? null : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming {t.label.toLowerCase()}.
            </p>
          )}
        </div>
      ),
    };
  });

  const viewableSessions = sessionsWithCounts.filter((session) => {
    const tab = configTabs.find((t) => t.value === session.session_type);
    return !tab || userRole >= tab.permissions[AccessLevel.view];
  });

  const hasHiddenSessions = sessionsWithCounts.length > viewableSessions.length;

  // Find the highest view permission among restricted tabs for the "All" banner
  const highestRestrictedViewRole = hasHiddenSessions
    ? Math.max(...configTabs.filter((t) => userRole < t.permissions[AccessLevel.view]).map((t) => t.permissions[AccessLevel.view]))
    : Role.anon;

  const allGateBanner = hasHiddenSessions
    ? getAccessGateBanner({
      userId,
      userRole,
      requiredViewRole: highestRestrictedViewRole as Role,
      accessRequestStatus,
      sport,
      label: "all sessions",
    })
    : null;

  const allOption = showAll
    ? {
      value: ALL_VALUE,
      label: "All",
      content: (
        <div className="space-y-4">
          {allGateBanner}
          {viewableSessions.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {viewableSessions.map((session) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  highlighted={session.id === highlight}
                  returnTab={ALL_VALUE}
                  userRole={userRole}
                  userSignupStatus={
                    userSignupStatusBySession.get(session.id) ?? null
                  }
                />
              ))}
            </div>
          ) : !hasHiddenSessions ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming sessions.
            </p>
          ) : null}
        </div>
      ),
    }
    : null;

  const filterOptions = allOption ? [allOption, ...typeOptions] : typeOptions;

  // Derive the active filter: from explicit ?tab=, from the session's type via ?session=, or fall back to "All" (or configured default)
  const scrollSession = scrollTo ? sessionsWithCounts.find((s) => s.id === scrollTo) : null;
  const resolvedValue = tab ?? scrollSession?.session_type;
  const validValues = filterOptions.map((o) => o.value);
  const fallback = config.defaultTab || (showAll ? ALL_VALUE : configTabs[0]?.value);
  const defaultValue =
    validValues.find((v) => v === resolvedValue) ?? fallback;

  return (
    <div className="space-y-4">
      <SessionFilter
        defaultValue={defaultValue}
        options={filterOptions}
        scrollTo={scrollTo}
        sport={sport}
      />
    </div>
  );
}

async function AdminButtonGate({ sport, userId }: { sport: string; userId: string }) {
  const supabase = await createClient();
  const { role } = await getUserSportRole(supabase, userId, sport);
  if (role < Role.admin) return null;
  return <AdminButton sport={sport} />;
}

export default async function SportAuthPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ tab?: string; highlight?: string; session?: string }>;
}) {
  const { sport } = await params;
  const config = resolvedSportsConfig[sport];
  if (!config) notFound();

  const { tab, highlight, session } = await searchParams;

  // ── Auth ───────────────────────────────────────────────────────
  // Middleware validates the JWT and forwards the user via request header.
  const user = config.authEnabled ? await getUser() : null;

  return (
    <SportPageShell
      user={user}
      sport={sport}
      actions={
        user ? (
          <Suspense>
            <AdminButtonGate sport={sport} userId={user.id} />
          </Suspense>
        ) : null
      }
    >
      <Suspense fallback={<LoadingContent />}>
        <SportSessionsContent
          sport={sport}
          tab={tab}
          highlight={highlight}
          scrollTo={session}
          userId={user?.id ?? null}
        />
      </Suspense>

      <div>
        <h2 className="font-semibold text-foreground mb-2">Important Notes</h2>
        <ul className="space-y-2.5 ml-4 text-muted-foreground">
          {config.notes?.map((note) => (
            <li key={note} className="flex items-start text-sm">
              <div className="w-1.5 h-1.5 bg-muted-foreground/40 rounded-full mr-3 mt-1.5 shrink-0"></div>
              <span>{note}</span>
            </li>
          ))}
        </ul>
      </div>
    </SportPageShell>
  );
}
