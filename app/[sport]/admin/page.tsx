import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUser, getUserSportRole } from "@/lib/supabase/user";
import PageHeader from "@/components/sports/page-header";
import {
  resolvedSportsConfig,
  Role,
} from "@/config/config-resolver";
import AdminSidebar from "@/components/sports/admin-sidebar";
import { getAdminTabComponent } from "@/config/admin-tab-registry";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import { getAccessRequests } from "@/lib/get-data";

async function AdminSidebarData({ sport }: { sport: string }) {
  const config = resolvedSportsConfig[sport];
  const adminTabs = config.adminTabs ?? [];

  const accessRequests = await getAccessRequests(sport);
  const pendingRequestCount = accessRequests.filter(
    (r) => r.status === "pending",
  ).length;

  return <AdminSidebar pendingRequestCount={pendingRequestCount} tabs={adminTabs} />;
}

async function AdminTabContent({ sport, tab }: { sport: string; tab: string }) {
  const TabComponent = getAdminTabComponent(tab);
  if (!TabComponent) {
    return <p className="text-sm text-muted-foreground py-4">Unknown tab.</p>;
  }
  return <TabComponent sport={sport} />;
}

export default async function AdminPage({
  params,
  searchParams,
}: {
  params: Promise<{ sport: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { sport } = await params;
  const config = resolvedSportsConfig[sport];
  if (!config) notFound();

  const { tab = "upcoming" } = await searchParams;
  const supabase = await createClient();
  const user = await getUser();

  if (!user) redirect(`/${sport}`);

  const { role } = await getUserSportRole(supabase, user.id, sport);
  if (role < Role.admin) redirect(`/${sport}`);

  return (
    <div className="max-w-full px-4 sm:px-6 lg:px-8 mx-auto mb-12 space-y-6">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />

      <h1 className="text-3xl font-bold text-foreground">{config.name} Admin</h1>

      <div className="flex flex-col md:flex-row gap-8">
        <Suspense>
          <AdminSidebarData sport={sport} />
        </Suspense>

        <div className="flex-1 min-w-0">
          <Suspense key={tab} fallback={<LoadingAdminContent />}>
            <AdminTabContent sport={sport} tab={tab} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
