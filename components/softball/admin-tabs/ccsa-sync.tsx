import CcsaSyncButton from "@/components/softball/ccsa-sync-button";
import { hasCcsaSession } from "@/lib/softball/ccsa-sync";
import {
  getCcsaLastSyncedAt,
  getCcsaPlayers,
  getAllProfiles,
  getTeamMembersWithProfiles,
} from "@/lib/softball/get-data";

export default async function CcsaAdminTab({ sport }: { sport: string }) {
  const [lastSyncedAt, ccsaPlayers, sessionResult, allProfiles, teamMembers] = await Promise.all([
    getCcsaLastSyncedAt(),
    getCcsaPlayers(),
    hasCcsaSession(),
    getAllProfiles(),
    getTeamMembersWithProfiles(sport),
  ]);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">CCSA Sync</h2>
      <div className="rounded-lg border bg-card p-6">
        <CcsaSyncButton
          lastSyncedAt={lastSyncedAt}
          hasSession={sessionResult.hasCookies}
          sessionEmail={sessionResult.email ?? undefined}
          initialPlayers={ccsaPlayers}
          teamMembers={teamMembers}
          allProfiles={allProfiles}
        />
      </div>
    </section>
  );
}
