import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Settings } from "lucide-react";
import SessionCard from "@/components/sports/session-card";
import SessionFilter from "@/components/sports/session-filter";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import SignInToSignupBanner from "@/components/sports/sign-in-to-signup-banner";
import SportPageShell from "@/components/sports/sport-page-shell";
import { Button } from "@/components/ui/button";
import { resolvedSportsConfig, Role, AccessLevel } from "@/config/config-resolver";
import { LoadingContent } from "@/components/sports/loading-content";
import { getUpcomingSessions, getUserAccessRequestStatus, getUserSignupStatuses } from "@/lib/get-data";
import type { SignupStatus } from "@/lib/supabase/types";

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
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  const showTeamAccessBanner = !!userId && config.tabs.some((t) =>
    userRole < t.permissions[AccessLevel.signup]
  );

  if (showTeamAccessBanner) {
    accessRequestStatus = await getUserAccessRequestStatus(userId!, sport);
  }

  const sessionIds = sessionsWithCounts.map((session) => session.id);
  const userSignupStatusBySession = userId
    ? await getUserSignupStatuses(userId, sessionIds)
    : new Map<string, SignupStatus>();

  const sessionsByType = Object.groupBy(sessionsWithCounts, (s) => s.session_type);

  const configTabs = config.tabs ?? [];
  const showAll = configTabs.length > 1;
  const ALL_VALUE = "all";
  const requiresSignIn = !!config.authEnabled && !userId;

  const typeOptions = configTabs.map((t) => {
    const sessions = sessionsByType[t.value] ?? [];

    return {
      value: t.value,
      label: t.label,
      content: (
        <>
          {sessions.length > 0 ? (
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
          ) : requiresSignIn ? null : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming {t.label.toLowerCase()}.
            </p>
          )}
        </>
      ),
    };
  });

  const allOption = showAll
    ? {
      value: ALL_VALUE,
      label: "All",
      content: (
        <>
          {sessionsWithCounts.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {sessionsWithCounts.map((session) => (
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
          ) : requiresSignIn ? null : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming sessions.
            </p>
          )}
        </>
      ),
    }
    : null;

  const filterOptions = allOption ? [allOption, ...typeOptions] : typeOptions;

  // Derive the active filter: from explicit ?tab=, from the session's type via ?session=, or fall back to "All" (or configured default)
  const scrollSession = scrollTo ? sessionsWithCounts.find((s) => s.id === scrollTo) : null;
  const resolvedValue = tab ?? scrollSession?.session_type;
  const validValues = filterOptions.map((o) => o.value);
  const defaultValue =
    validValues.find((v) => v === resolvedValue) ??
    (showAll ? ALL_VALUE : config.defaultTab ?? configTabs[0]?.value);

  const showSignInBanner =
    !userId && !!config.authEnabled && config.hasRestrictedAccess;

  return (
    <div className="space-y-4">
      {showTeamAccessBanner && (
        <TeamAccessBanner
          requestStatus={accessRequestStatus}
          sport={sport}
        />
      )}
      {showSignInBanner && (
        <SignInToSignupBanner />
      )}
      <SessionFilter
        defaultValue={defaultValue}
        options={filterOptions}
        scrollTo={scrollTo}
        sport={sport}
        showFilters={!requiresSignIn}
      />
    </div>
  );
}

async function AdminButton({ sport, userId }: { sport: string; userId: string }) {
  const supabase = await createClient();
  const { role } = await getUserSportRole(supabase, userId, sport);
  if (role < Role.admin) return null;
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
