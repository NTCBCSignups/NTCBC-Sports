import { createClient } from "@/lib/supabase/server";
import CcsaSyncButton from "@/components/softball/ccsa-sync-button";
import { hasCcsaSession } from "@/lib/softball/ccsa-sync";

export default async function CcsaAdminTab({ sport }: { sport: string }) {
    const supabase = await createClient();

    const [syncResult, playersResult, sessionResult, profilesResult, teamMembersResult] = await Promise.all([
        supabase
            .from("ccsa_players")
            .select("synced_at")
            .order("synced_at", { ascending: false })
            .limit(1)
            .maybeSingle(),
        supabase
            .from("ccsa_players")
            .select("email, first_name, last_name, waiver_status"),
        hasCcsaSession(),
        supabase.from("profiles").select("full_name, email"),
        supabase
            .from("sport_roles")
            .select("user_id, is_team_member, profiles!sport_roles_user_id_fkey(full_name, email)")
            .eq("sport", sport)
            .eq("is_team_member", true),
    ]);

    const ccsaPlayers = (playersResult.data ?? []).map((p) => ({
        email: p.email,
        first_name: p.first_name,
        last_name: p.last_name,
        waiver_status: p.waiver_status,
    }));

    return (
        <section className="space-y-3">
            <h2 className="text-lg font-semibold text-gray-900">
                CCSA Sync
            </h2>
            <div className="rounded-lg border bg-white p-6">
                <CcsaSyncButton
                    lastSyncedAt={syncResult.data?.synced_at ?? null}
                    hasSession={sessionResult.hasCookies}
                    sessionEmail={sessionResult.email ?? undefined}
                    initialPlayers={ccsaPlayers}
                    teamMembers={(teamMembersResult.data ?? []).map((m) => ({
                        email: (m.profiles as unknown as { email: string })?.email ?? "",
                        full_name: (m.profiles as unknown as { full_name: string })?.full_name ?? "",
                    }))}
                    allProfiles={(profilesResult.data ?? []).map((p) => ({
                        email: p.email ?? "",
                        full_name: p.full_name ?? "",
                    }))}
                />
            </div>
        </section>
    );
}
