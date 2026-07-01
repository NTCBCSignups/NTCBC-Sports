import type { ComponentType } from "react";
import AdminTabMembers from "@/components/sports/admin/admin-tabs/members";
import AdminTabCreate from "@/components/sports/admin/admin-tabs/create";
import AdminTabUpcoming from "@/components/sports/admin/admin-tabs/upcoming";
import AdminTabPast from "@/components/sports/admin/admin-tabs/past";
import AdminTabSettings from "@/components/sports/admin/admin-tabs/settings";
import CcsaAdminTab from "@/components/softball/admin-tabs/ccsa-sync";

/**
 * Registry mapping admin tab IDs to their server components.
 * This is the single wiring point between sport-specific tab
 * implementations and the generic admin page.
 */
const adminTabComponents: Record<string, ComponentType<{ sport: string }>> = {
  members: AdminTabMembers,
  create: AdminTabCreate,
  upcoming: AdminTabUpcoming,
  past: AdminTabPast,
  settings: AdminTabSettings,
  ccsa: CcsaAdminTab,
};

export function getAdminTabComponent(tabId: string) {
  return adminTabComponents[tabId];
}
