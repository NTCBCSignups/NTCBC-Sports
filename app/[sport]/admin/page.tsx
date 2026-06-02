import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import PageHeader from "@/components/sports/page-header";
import {
  type ResolvedSportConfig,
  Role,
} from "@/config/config-resolver";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import AdminLayout from "@/components/sports/admin-sidebar";
import { getAdminTabComponent } from "@/config/admin-tab-registry";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import { getAccessRequests } from "@/lib/get-data";

async function AdminShell({
  sport,
  tab,
  config,
}: {
  sport: string;
  tab: string;
  config: ResolvedSportConfig;
}) {
  const adminTabs = config.adminTabs ?? [];

  const accessRequests = await getAccessRequests(sport);
  const pendingRequestCount = accessRequests.filter(
    (r) => r.status === "pending",
  ).length;

  const TabComponent = getAdminTabComponent(tab);

  return (
    <AdminLayout pendingRequestCount={pendingRequestCount} tabs={adminTabs}>
      {TabComponent ? (
        <TabComponent sport={sport} />
      ) : (
        <p className="text-sm text-muted-foreground py-4">Unknown tab.</p>
      )}
    </AdminLayout>
  );
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { sport } = await params;
  const config = await getResolvedSportConfig(sport);
  if (!config) notFound();

  const { tab = "upcoming" } = await searchParams;
  const supabase = await createClient();
  const user = await getUser();

  if (!user) redirect(`/${sport}`);

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (role < Role.admin) redirect(`/${sport}`);

  return (
    <div className="max-w-6xl mx-auto mb-12 space-y-6">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />

      <h1 className="text-3xl font-bold text-foreground">{config.name} Admin</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense fallback={<LoadingAdminContent />}>
          <AdminShell sport={sport} tab={tab} config={config} />
        </Suspense>
      </div>
    </div>
  );
}
