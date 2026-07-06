import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUser, getCachedUserSportRole } from "@/lib/supabase/user";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getStatsData } from "@/lib/get-statistics";
import { Role } from "@/config/config-resolver";
import PageHeader from "@/components/sports/page-header";
import StatsView from "@/components/sports/statistics/stats-view";

export default async function UserStatsPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  const config = await getResolvedSportConfig(sport);
  if (!config) notFound();

  const user = await getUser();
  if (!user) redirect(`/${sport}`);

  const supabase = await createClient();
  const { role } = await getCachedUserSportRole(supabase, user.id, sport);
  const isAdmin = role >= Role.admin;

  // Admins get full data (can toggle to admin view); regular users get only their own signups
  const data = await getStatsData(sport, isAdmin ? undefined : user.id);

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6 px-4">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />
      <StatsView data={data} defaultMode="personal" userId={user.id} canToggleMode={isAdmin} />
    </div>
  );
}
