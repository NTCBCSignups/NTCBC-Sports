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
import { sportsConfig, hasRestrictedAccess } from "@/config/sports-config";
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
  const config = sportsConfig[sport];
  const supabase = await createClient();

  // ── Roles & sessions (parallel) ────────────────────────────────
  const [roleResult, sessionsWithCounts] = await Promise.all([
    userId
      ? getUserSportRole(supabase, userId, sport)
      : Promise.resolve({ isAdmin: false, isTeamMember: false }),
    getUpcomingSessions(sport),
  ]);

  const { isTeamMember } = roleResult;
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  if (userId && hasRestrictedAccess(config) && !isTeamMember) {
    accessRequestStatus = await getUserAccessRequestStatus(userId, sport);
  }

  const sessionIds = sessionsWithCounts.map((session) => session.id);
  const userSignupStatusBySession = userId
    ? await getUserSignupStatuses(userId, sessionIds)
    : new Map<string, SignupStatus>();

  const sessionsByType = Object.groupBy(sessionsWithCounts, (s) => s.session_type);

  const configTabs = config.tabs ?? [];
  const showAll = configTabs.length > 1;
  const ALL_VALUE = "all";

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
                  userSignupStatus={
                    userSignupStatusBySession.get(session.id) ?? null
                  }
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
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

  const showTeamAccessBanner =
    !!userId && hasRestrictedAccess(config) && !isTeamMember;
  const showSignInBanner =
    !userId && !!config.authEnabled && hasRestrictedAccess(config);

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
      />
    </div>
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
  searchParams: Promise<{ tab?: string; highlight?: string; session?: string }>;
}) {
  const { sport } = await params;
  const config = sportsConfig[sport];
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
