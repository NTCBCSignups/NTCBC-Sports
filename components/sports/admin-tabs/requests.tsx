import { Badge } from "@/components/ui/badge";
import AdminAccessRequests from "@/components/sports/admin-access-requests";
import { getAccessRequests } from "@/lib/get-data";
import type { AccessRequestStatus } from "@/lib/supabase/types";

export default async function AdminTabRequests({ sport }: { sport: string }) {
    const accessRequests = await getAccessRequests(sport);

    const formattedRequests = accessRequests.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        status: r.status as AccessRequestStatus,
        created_at: r.created_at,
        profiles: r.profiles,
    }));

    const pendingRequests = formattedRequests.filter(
        (r) => r.status === "pending",
    );

    return (
        <section className="space-y-3">
            <div className="flex items-center gap-2">
                <h2 className="text-lg font-semibold text-foreground">
                    Team Access Requests
                </h2>
                {pendingRequests.length > 0 && (
                    <Badge variant="destructive">
                        {pendingRequests.length} pending
                    </Badge>
                )}
            </div>
            <AdminAccessRequests sport={sport} requests={formattedRequests} />
        </section>
    );
}
