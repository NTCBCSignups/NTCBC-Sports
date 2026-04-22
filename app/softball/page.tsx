import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import SessionCard from "@/components/softball/session-card";
import TeamAccessBanner from "@/components/softball/team-access-banner";
import SignInPrompt from "@/components/softball/sign-in-prompt";
import SportPageShell from "@/components/softball/softball-page-shell";
import { Button } from "@/components/ui/button";
import { sportsConfig } from "@/lib/sports-config";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SPORT = "softball";
const config = sportsConfig[SPORT];

export default async function SoftballPage() {
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

  let { isAdmin, isTeamMember } = roleResult;
  const { data: sessions } = sessionsResult;
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  if (user && config.restrictedAccessEnabled && !isTeamMember) {
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

  const scheduledGames = sessionsWithCounts.filter(
    (s) => s.session_type === "scheduled_game",
  );
  const dropInPractices = sessionsWithCounts.filter(
    (s) => s.session_type === "drop_in_practice",
  );

  const adminButton = isAdmin ? (
    <Button asChild variant="outline" size="sm" className="rounded-full">
      <Link href="/softball/admin">
        <Settings className="h-4 w-4" />
        Admin
      </Link>
    </Button>
  ) : null;

  return (
    <SportPageShell user={user} sport={SPORT} actions={adminButton}>
      <Tabs defaultValue="drop_in_practice" className="gap-4">
        <TabsList className="max-sm:w-full rounded-full">
          <TabsTrigger
            value="scheduled_game"
            className="max-sm:flex-1 rounded-full px-5"
          >
            Scheduled Games
          </TabsTrigger>
          <TabsTrigger
            value="drop_in_practice"
            className="max-sm:flex-1 rounded-full px-5"
          >
            Drop-in Practice
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled_game" className="space-y-4">
          {config.restrictedAccessEnabled && !isTeamMember && (
            <TeamAccessBanner
              requestStatus={accessRequestStatus}
              sport={SPORT}
            />
          )}
          {isTeamMember ? (
            scheduledGames.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2">
                {scheduledGames.map((session) => (
                  <SessionCard key={session.id} session={session} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-8 text-center">
                No upcoming scheduled games.
              </p>
            )
          ) : null}
        </TabsContent>

        <TabsContent value="drop_in_practice" className="space-y-4">
          {dropInPractices.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2">
              {dropInPractices.map((session) => (
                <SessionCard key={session.id} session={session} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 py-8 text-center">
              No upcoming drop-in practices.
            </p>
          )}
        </TabsContent>
      </Tabs>

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
