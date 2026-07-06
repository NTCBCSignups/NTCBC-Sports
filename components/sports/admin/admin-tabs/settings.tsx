import { getResolvedSportConfig } from "@/lib/get-sport-config";
import SportConfigForm from "@/components/sports/admin/admin-tabs/settings/index";

import type { AdminTabProps } from "@/config/admin-tab-registry";

export default async function AdminTabSettings({ sport }: AdminTabProps) {
  const config = await getResolvedSportConfig(sport);

  if (!config) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground py-4">Sport config not found.</p>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Settings</h2>
      <SportConfigForm sport={sport} initialConfig={config} />
    </section>
  );
}
