import { getAccessRequests, getSportMembers } from "@/lib/get-data";
import AdminPeopleView from "@/components/sports/admin/admin-people-view";
import type { AccessRequestStatus } from "@/lib/supabase/types";

export default async function AdminTabPeople({ sport }: { sport: string }) {
  const [members, accessRequests] = await Promise.all([
    getSportMembers(sport),
    getAccessRequests(sport),
  ]);

  const pendingRequests = accessRequests
    .filter((r) => r.status === "pending")
    .map((r) => ({
      id: r.id,
      user_id: r.user_id,
      status: r.status as AccessRequestStatus,
      created_at: r.created_at,
      profiles: r.profiles,
    }));

  return <AdminPeopleView sport={sport} members={members} pendingRequests={pendingRequests} />;
}
