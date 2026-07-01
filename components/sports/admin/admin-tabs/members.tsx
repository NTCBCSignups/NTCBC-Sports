import { getAccessRequests, getSportMembers } from "@/lib/get-data";
import AdminMembersView from "@/components/sports/admin/admin-members-view";
import type { AccessRequestStatus } from "@/lib/supabase/types";

export default async function AdminTabMembers({ sport }: { sport: string }) {
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

  return <AdminMembersView sport={sport} members={members} pendingRequests={pendingRequests} />;
}
