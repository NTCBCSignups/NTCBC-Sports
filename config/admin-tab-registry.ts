import type { ComponentType } from "react";
import AdminTabRequests from "@/components/sports/admin-tabs/requests";
import AdminTabCreate from "@/components/sports/admin-tabs/create";
import AdminTabUpcoming from "@/components/sports/admin-tabs/upcoming";
import AdminTabPast from "@/components/sports/admin-tabs/past";
import CcsaAdminTab from "@/components/softball/admin-tabs/ccsa-sync";

/**
 * Registry mapping admin tab IDs to their server components.
 * This is the single wiring point between sport-specific tab
 * implementations and the generic admin page.
 */
const adminTabComponents: Record<string, ComponentType<{ sport: string }>> = {
    requests: AdminTabRequests,
    create: AdminTabCreate,
    upcoming: AdminTabUpcoming,
    past: AdminTabPast,
    ccsa: CcsaAdminTab,
};

export function getAdminTabComponent(tabId: string) {
    return adminTabComponents[tabId];
}
