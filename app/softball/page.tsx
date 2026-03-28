import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import AuthButton from "@/components/sports/auth-button";
import SessionCard from "@/components/sports/session-card";
import TeamAccessBanner from "@/components/sports/team-access-banner";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

const SPORT = "softball";

export default async function SoftballPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isAdmin = false;
  let isTeamMember = false;
  let accessRequestStatus: "pending" | "approved" | "rejected" | null = null;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    isAdmin = profile?.role === "admin";

    if (!isAdmin) {
      const { data: sportRole } = await supabase
        .from("sport_roles")
        .select("role, is_team_member")
        .eq("user_id", user.id)
        .eq("sport", SPORT)
        .single();

      isAdmin = sportRole?.role === "admin";
      isTeamMember = sportRole?.is_team_member || isAdmin;
    } else {
      isTeamMember = true;
    }

    if (!isTeamMember) {
      const { data: request } = await supabase
        .from("team_access_requests")
        .select("status")
        .eq("user_id", user.id)
        .eq("sport", SPORT)
        .single();
      accessRequestStatus = request?.status ?? null;
    }
  }

  const { data: sessions } = await supabase
    .from("sessions")
    .select("*, signups(count)")
    .eq("sport", SPORT)
    .gte("date", new Date().toISOString().split("T")[0])
    .order("date", { ascending: true });

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

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
        >
          <Image
            src="/favicon.ico"
            alt="NTCBC"
            width={18}
            height={18}
            className="rounded-sm"
          />
          NTCBC Sports
        </Link>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/softball/admin">
                <Settings className="h-4 w-4" />
                Admin
              </Link>
            </Button>
          )}
          <AuthButton user={user} />
        </div>
      </div>

      <div className="space-y-2">
        <h1 className="text-4xl font-bold text-gray-900">Softball</h1>
        <p className="text-sm text-gray-700">
          Join us for scheduled games or drop-in practice sessions. Sign in with
          Google to view and sign up for upcoming sessions.
        </p>
      </div>

      {!user ? (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center space-y-3">
          <p className="text-gray-700 font-medium">
            Sign in to view and sign up for sessions
          </p>
          <p className="text-sm text-gray-500">
            Use your Google account to get started.
          </p>
        </div>
      ) : (
        <Tabs defaultValue="scheduled_game" className="gap-4">
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
            {!isTeamMember && (
              <TeamAccessBanner requestStatus={accessRequestStatus} />
            )}
            {isTeamMember ? (
              scheduledGames.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
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
              <div className="grid gap-4 sm:grid-cols-2">
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
      )}

      <div>
        <h2 className="font-semibold text-gray-900 mb-2">Important Notes</h2>
        <ul className="space-y-2.5 ml-4 text-gray-700">
          <li className="flex items-start text-sm">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
            <span>
              Softball has two session types: Scheduled Games (team members only)
              and Drop-in Practice (open to all).
            </span>
          </li>
          <li className="flex items-start text-sm">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
            <span>Sign in with Google to sign up for sessions.</span>
          </li>
          <li className="flex items-start text-sm">
            <div className="w-1.5 h-1.5 bg-gray-400 rounded-full mr-3 mt-1.5 shrink-0"></div>
            <span>
              Please contact the admins if you have any questions.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}
