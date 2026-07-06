import { getStatsData } from "@/lib/get-statistics";
import StatsView from "@/components/sports/statistics/stats-view";
import type { AdminTabProps } from "@/config/admin-tab-registry";

export default async function AdminTabStatistics({ sport, userId }: AdminTabProps) {
  const data = await getStatsData(sport);
  return <StatsView data={data} defaultMode="all" userId={userId} canToggleMode />;
}
