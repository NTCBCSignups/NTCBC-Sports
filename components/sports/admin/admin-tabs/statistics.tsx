import { getStatistics } from "@/lib/get-statistics";
import { getSportUsers } from "@/lib/get-data";
import AdminStatsView from "@/components/sports/admin/admin-stats-view";

export default async function AdminTabStatistics({ sport }: { sport: string }) {
  const [stats, users] = await Promise.all([getStatistics(sport), getSportUsers(sport)]);
  return <AdminStatsView sport={sport} stats={stats} users={users} />;
}
