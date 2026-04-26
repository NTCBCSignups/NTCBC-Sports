import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Settings } from "lucide-react";
import SessionCard from "@/components/softball/session-card";
import SessionTabs from "@/components/softball/session-tabs";
import TeamAccessBanner from "@/components/softball/team-access-banner";
import SignInPrompt from "@/components/softball/sign-in-prompt";
import SportPageShell from "@/components/softball/softball-page-shell";
import { Button } from "@/components/ui/button";
import { sportsConfig, hasRestrictedAccess } from "@/lib/sports-config";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SPORT = "softball";
const config = sportsConfig[SPORT];

export default async function SoftballPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; highlight?: string }>;
}) {
  const { tab, highlight } = await searchParams;
  const supabase = await createClient();

  // ── Auth ───────────────────────────────────────────────────────
  // Middleware validates the JWT and forwards the user via request header.
  const user = config.authEnabled ? await getUser() : null;

  if (config.authEnabled && !user) {
    return <SignInPrompt sport={SPORT} />;
  }

  // ── Roles, access & sessions (parallel) ─────────────────────────
  const queryClient = user ? supabase : createAdminClient();

  const [roleResult, sessionsResult] = await Promise.all([
    user
      ? getUserSportRole(supabase, user.id, SPORT)
      : Promise.resolve({ isAdmin: false, isTeamMember: true }),
    queryClient
      .from("sessions")
      .select("*, signups(count)")
      .eq("sport", SPORT)
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
      .eq("sport", SPORT)
      .single();
    accessRequestStatus = request?.status ?? null;
  }

  const sessionsWithCounts = (sessions ?? []).map((s) => ({
    ...s,
    signup_count:
      (s.signups as unknown as { count: number }[])?.[0]?.count ?? 0,
  }));

  const sessionsByType = Object.groupBy(sessionsWithCounts, (s) => s.session_type);

  const adminButton = isAdmin ? (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href="/softball/admin">
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
              sport={SPORT}
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
    <SportPageShell user={user} sport={SPORT} actions={adminButton}>
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
