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
import type { ResolvedSessionTab, AccessBannerText } from "@/config/config-resolver";
import { LoadingContent } from "@/components/sports/loading-content";
import { getUpcomingSessions, getUserAccessRequestStatus, getUserSignupStatuses } from "@/lib/get-data";
import type { SignupStatus, AccessRequestStatus } from "@/lib/supabase/types";

// ── Access level ordering (for finding first unmet level) ────────
const ACCESS_LEVELS: Exclude<AccessLevel, "admin">[] = [
  AccessLevel.overview,
  AccessLevel.view,
  AccessLevel.signup,
];

// ── Access banner text (data-driven) ─────────────────────────────
function buildAccessLevelText(
  openTitle: (l: string) => string,
  teamTitle: string,
  description: (l: string) => string,
) {
  return {
    open: {
      title: openTitle,
      message: (l: string) => `Sign in with your Google account to ${description(l)}.`,
    },
    teamSignedOut: {
      title: () => teamTitle,
      message: (l: string) => `Sign in and request team access to ${description(l)}.`,
    },
    teamSignedIn: {
      title: () => teamTitle,
      message: (l: string) => `Request team access to ${description(l)}.`,
    },
  };
}

const ACCESS_LEVEL_TEXT: Record<
  Exclude<AccessLevel, "admin">,
  { open: AccessBannerText; teamSignedOut: AccessBannerText; teamSignedIn: AccessBannerText }
> = {
  [AccessLevel.overview]: buildAccessLevelText(
    (l) => `Sign in to view ${l}`,
    "Team members only",
    (l) => `view and sign up for ${l}`,
  ),
  [AccessLevel.view]: buildAccessLevelText(
    (l) => `Sign in to view ${l}`,
    "Team access required",
    (l) => `view details and sign up for ${l}`,
  ),
  [AccessLevel.signup]: buildAccessLevelText(
    (l) => `Sign in to sign up for ${l}`,
    "Team access required to sign up",
    (l) => `sign up for ${l}`,
  ),
};

/**
 * Finds the first AccessLevel the user doesn't meet for a tab.
 * Returns null if the user meets all levels (or only lacks admin).
 */
function getFirstUnmetLevel(tab: ResolvedSessionTab, userRole: Role): Exclude<AccessLevel, "admin"> | null {
  for (const level of ACCESS_LEVELS) {
    if (userRole < tab.permissions[level]) return level;
  }
  return null;
}

/**
 * Pure lookup — resolves the pre-composed banner text for a given scenario.
 */
function getBannerText(level: Exclude<AccessLevel, "admin">, requiredRole: Role, isSignedIn: boolean): AccessBannerText {
  const entry = ACCESS_LEVEL_TEXT[level];
  if (requiredRole >= Role.teamUser) return isSignedIn ? entry.teamSignedIn : entry.teamSignedOut;
  return entry.open;
}

/**
 * Returns the appropriate banner JSX for a tab, or null if no banner needed.
 * Purely data-driven: looks up text by the first unmet AccessLevel.
 */
function renderAccessBanner({
  userId,
  tab,
  userRole,
  accessRequestStatus,
  sport,
}: {
  userId: string | null;
  tab: ResolvedSessionTab;
  userRole: Role;
  accessRequestStatus: AccessRequestStatus | null;
  sport: string;
}) {
  const unmetLevel = getFirstUnmetLevel(tab, userRole);
  if (!unmetLevel) return null;

  const requiredRole = tab.permissions[unmetLevel];
  const text = getBannerText(unmetLevel, requiredRole, !!userId);
  const label = tab.label.toLowerCase();

  if (!userId) {
    return (
      <SignInToSignupBanner
        title={text.title(label)}
        message={text.message(label)}
      />
    );
  }

  return (
    <TeamAccessBanner
      requestStatus={accessRequestStatus}
      sport={sport}
      label={label}
      bannerMessage={text.message(label)}
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
    getFirstUnmetLevel(t, userRole) !== null
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

  // Per-tab: resolve banner + sessions using the data-driven access level lookup
  const tabAccess = configTabs.map((t) => {
    const unmetLevel = getFirstUnmetLevel(t, userRole);
    const isGated = unmetLevel === AccessLevel.overview;
    const banner = renderAccessBanner({ userId, tab: t, userRole, accessRequestStatus, sport });
    return { tab: t, unmetLevel, isGated, banner };
  });

  const typeOptions = tabAccess.map(({ tab: t, isGated, banner }) => {
    const sessions = sessionsByType[t.value] ?? [];

    return {
      value: t.value,
      label: t.label,
      content: (
        <div className="space-y-4">
          {isGated ? (
            banner
          ) : sessions.length > 0 ? (
            <>
              {banner}
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
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">
              No upcoming {t.label.toLowerCase()}.
            </p>
          )}
        </div>
      ),
    };
  });

  // "All" tab: show sessions from non-gated tabs, plus a banner if any tabs are restricted
  const viewableSessions = sessionsWithCounts.filter((s) => {
    const access = tabAccess.find((a) => a.tab.value === s.session_type);
    return !access || !access.isGated;
  });

  // "All" tab banner: derived from restricted tabs' labels and highest unmet level
  const restrictedTabs = tabAccess.filter((a) => a.unmetLevel !== null);
  const allBanner = (() => {
    if (restrictedTabs.length === 0) return null;

    // Use the most restrictive (earliest in access level order) unmet level
    const highestRestriction = restrictedTabs.reduce((worst, a) => {
      const wIdx = ACCESS_LEVELS.indexOf(worst.unmetLevel!);
      const aIdx = ACCESS_LEVELS.indexOf(a.unmetLevel!);
      return aIdx < wIdx ? a : worst;
    });

    const unmetLevel = highestRestriction.unmetLevel!;
    const requiredRole = highestRestriction.tab.permissions[unmetLevel];
    const text = getBannerText(unmetLevel, requiredRole, !!userId);

    // Compose label: use tab name if only one, otherwise "some sessions"
    const label = restrictedTabs.length === 1
      ? restrictedTabs[0].tab.label.toLowerCase()
      : "some sessions";

    if (!userId) {
      return (
        <SignInToSignupBanner
          title={text.title(label)}
          message={text.message(label)}
        />
      );
    }

    return (
      <TeamAccessBanner
        requestStatus={accessRequestStatus}
        sport={sport}
        label={label}
        bannerMessage={text.message(label)}
      />
    );
  })();

  const allOption = showAll
    ? {
      value: ALL_VALUE,
      label: "All",
      content: (
        <div className="space-y-4">
          {allBanner}
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
          ) : restrictedTabs.length === 0 ? (
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
