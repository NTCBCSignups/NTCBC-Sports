import { getResolvedSportConfig } from "@/lib/get-sport-config";
import SessionAccordion, { type SessionSignupEntry } from "@/components/sports/admin/admin-session-accordion";
import { getAllSessions, getSessionSignups, getTeamMembers } from "@/lib/get-data";
import { getTodayInSportTimezone } from "@/lib/timezone";
import type { SignupStatus } from "@/lib/supabase/types";

export default async function AdminTabPast({ sport }: { sport: string }) {
    const config = await getResolvedSportConfig(sport);
    if (!config) {
        return <p className="text-sm text-muted-foreground py-4">Sport config not found.</p>;
    }

    const [sessions, teamMemberIds] = await Promise.all([
        getAllSessions(sport),
        getTeamMembers(sport),
    ]);

    const today = getTodayInSportTimezone();
    const pastSessions = sessions.filter((s) => s.date < today);

    const allSignupArrays = await Promise.all(
        pastSessions.map((s) => getSessionSignups(s.id)),
    );

    const signupsBySession = new Map<string, SessionSignupEntry[]>();
    for (let i = 0; i < pastSessions.length; i++) {
        signupsBySession.set(
            pastSessions[i].id,
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
            <h2 className="text-lg font-semibold text-foreground">
                Past Sessions ({pastSessions.length})
            </h2>
            <SessionAccordion
                config={config}
                sport={sport}
                sessions={pastSessions}
                signupsBySession={signupsBySession}
                teamMemberIds={teamMemberIds}
                muted
            />
        </section>
    );
}
