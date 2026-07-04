import { getStatistics } from "@/lib/get-statistics";
import AdminStatsView from "@/components/sports/admin/admin-stats-view";

export default async function AdminTabStatistics({ sport }: { sport: string }) {
  const stats = await getStatistics(sport);
  return <AdminStatsView stats={stats} />;
}
