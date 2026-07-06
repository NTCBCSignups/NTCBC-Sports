import CreateForm from "@/components/sports/admin/admin-tabs/create-form";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getSportUsers } from "@/lib/get-data";

import type { AdminTabProps } from "@/config/admin-tab-registry";

export default async function AdminTabCreate({ sport }: AdminTabProps) {
  const config = await getResolvedSportConfig(sport);
  if (!config) {
    return <p className="text-sm text-muted-foreground py-4">Sport config not found.</p>;
  }

  const sessionTabs = config.tabs.map((tab) => ({ value: tab.value, label: tab.label }));
  const sportUsers = await getSportUsers(sport);

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold text-foreground">Create Session</h2>
      <div className="rounded-lg border bg-card p-4 sm:p-6">
        <CreateForm
          sport={sport}
          sessionTabs={sessionTabs}
          defaultTab={config.defaultTab}
          sportUsers={sportUsers}
        />
      </div>
    </section>
  );
}
