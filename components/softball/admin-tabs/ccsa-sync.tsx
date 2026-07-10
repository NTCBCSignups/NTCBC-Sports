import CcsaSyncButton from "@/components/softball/ccsa-sync-button";
import { hasCcsaSession } from "@/lib/softball/ccsa-sync";
import {
  getCcsaPlayersPreview,
  getCcsaGamesPreview,
} from "@/lib/softball/ccsa-preview";
import type { PlayersPreview, GamesPreview } from "@/lib/softball/ccsa-preview";
import { getAllProfiles, getTeamMembersWithProfiles } from "@/lib/softball/get-data";

import type { AdminTabProps } from "@/config/admin-tab-registry";

export default async function CcsaAdminTab({ sport }: AdminTabProps) {
  const [sessionResult, allProfiles, teamMembers] = await Promise.all([
    hasCcsaSession(),
    getAllProfiles(),
    getTeamMembersWithProfiles(sport),
  ]);

  // Eagerly load read-only previews if already authenticated with CCSA
  let playersPreview: PlayersPreview | null = null;
  let gamesPreview: GamesPreview | null = null;

  if (sessionResult.hasCookies) {
    const [pResult, gResult] = await Promise.all([
      getCcsaPlayersPreview(),
      getCcsaGamesPreview(),
    ]);
    if (!("error" in pResult)) playersPreview = pResult;
    if (!("error" in gResult)) gamesPreview = gResult;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">CCSA Sync</h2>
      <div className="rounded-lg border bg-card p-6">
        <CcsaSyncButton
          hasSession={sessionResult.hasCookies}
          sessionEmail={sessionResult.email ?? undefined}
          teamMembers={teamMembers}
          allProfiles={allProfiles}
          playersPreview={playersPreview}
          gamesPreview={gamesPreview}
        />
      </div>
    </section>
  );
}
