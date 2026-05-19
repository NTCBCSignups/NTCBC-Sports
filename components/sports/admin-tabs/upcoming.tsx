import { resolvedSportsConfig } from "@/config/config-resolver";
import SessionAccordion, { type SessionSignupEntry } from "@/components/sports/admin-session-accordion";
import { getAllSessions, getSessionSignups, getTeamMembers } from "@/lib/get-data";
import { getTodayInSportTimezone } from "@/lib/timezone";
import type { SignupStatus } from "@/lib/supabase/types";

export default async function AdminTabUpcoming({ sport }: { sport: string }) {
    const config = resolvedSportsConfig[sport];

    const [sessions, teamMemberIds] = await Promise.all([
        getAllSessions(sport),
        getTeamMembers(sport),
    ]);

    const today = getTodayInSportTimezone();
    const upcomingSessions = sessions
        .filter((s) => s.date >= today)
        .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return a.time_start.localeCompare(b.time_start);
        });

    const allSignupArrays = await Promise.all(
        upcomingSessions.map((s) => getSessionSignups(s.id)),
    );

    const signupsBySession = new Map<string, SessionSignupEntry[]>();
    for (let i = 0; i < upcomingSessions.length; i++) {
        signupsBySession.set(
            upcomingSessions[i].id,
            (allSignupArrays[i] ?? []).map((signup) => ({
                id: signup.id,
                user_id: signup.user_id,
                status: signup.status as SignupStatus,
                created_at: signup.created_at,
                profiles: signup.profiles,
            })),
        );
    }

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
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
    );
}
