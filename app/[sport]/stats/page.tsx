import { notFound, redirect } from "next/navigation";
import { getUser } from "@/lib/supabase/user";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getStatsData } from "@/lib/get-statistics";
import PageHeader from "@/components/sports/page-header";
import StatsView from "@/components/sports/admin/admin-tabs/statistics/stats-view";

export default async function UserStatsPage({ params }: { params: Promise<{ sport: string }> }) {
  const { sport } = await params;
  const config = await getResolvedSportConfig(sport);
  if (!config) notFound();

  const user = await getUser();
  if (!user) redirect(`/${sport}`);

  const data = await getStatsData(sport, user.id);

  return (
    <div className="max-w-4xl mx-auto mb-12 space-y-6 px-4">
      <PageHeader backHref={`/${sport}`} backLabel={`Back to ${config.name}`} />
      <StatsView data={data} mode="personal" userId={user.id} />
    </div>
  );
}
