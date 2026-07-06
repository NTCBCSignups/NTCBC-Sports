import { getStatsData } from "@/lib/get-statistics";
import StatsView from "./stats-view";

export default async function AdminTabStatistics({ sport }: { sport: string }) {
  const data = await getStatsData(sport);
  return <StatsView data={data} />;
}
