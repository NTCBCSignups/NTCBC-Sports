import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import PageHeader from "@/components/sports/page-header";
import { type AdminTabMeta, type ResolvedSportConfig, Role } from "@/config/config-resolver";
import { SETTINGS_ADMIN_TAB } from "@/config/admin-tab-metadata";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import AdminLayout from "@/components/sports/admin/admin-sidebar";
import { getAdminTabComponent } from "@/config/admin-tab-registry";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import { getAccessRequests } from "@/lib/get-data";

function withSettingsTab(tabs: AdminTabMeta[]): AdminTabMeta[] {
  const nonSettingsTabs = tabs.filter((tab) => tab.id !== SETTINGS_ADMIN_TAB.id);
  return [SETTINGS_ADMIN_TAB, ...nonSettingsTabs];
}

function resolveDefaultAdminTab(tabs: AdminTabMeta[], configuredDefaultTab?: string): string {
  const normalizedConfiguredDefault = configuredDefaultTab?.trim();
  if (normalizedConfiguredDefault && tabs.some((tab) => tab.id === normalizedConfiguredDefault)) {
    return normalizedConfiguredDefault;
  }

  if (tabs.some((tab) => tab.id === SETTINGS_ADMIN_TAB.id)) {
    return SETTINGS_ADMIN_TAB.id;
  }

  return tabs[0]?.id ?? SETTINGS_ADMIN_TAB.id;
}

async function AdminShell({
  sport,
  requestedTab,
  config,
}: {
  sport: string;
  requestedTab?: string;
  config: ResolvedSportConfig;
}) {
  const adminTabs = withSettingsTab(config.adminTabs ?? []);
  const defaultTab = resolveDefaultAdminTab(adminTabs, config.defaultAdminTab);
  const activeTab =
    requestedTab && adminTabs.some((tab) => tab.id === requestedTab) ? requestedTab : defaultTab;

  const accessRequests = await getAccessRequests(sport);
  const pendingRequestCount = accessRequests.filter((r) => r.status === "pending").length;

  const TabComponent = getAdminTabComponent(activeTab);

  return (
    <AdminLayout pendingRequestCount={pendingRequestCount} tabs={adminTabs} defaultTab={activeTab}>
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

  const { tab } = await searchParams;
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
          <AdminShell sport={sport} requestedTab={tab} config={config} />
        </Suspense>
      </div>
    </div>
  );
}
