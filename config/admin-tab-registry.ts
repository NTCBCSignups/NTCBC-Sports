import type { ComponentType } from "react";
import CcsaAdminTab from "@/components/softball/ccsa-admin-tab";

/**
 * Registry mapping admin tab IDs to their server components.
 * This is the single wiring point between sport-specific tab
 * implementations and the generic admin page.
 */
const adminTabComponents: Record<string, ComponentType<{ sport: string }>> = {
    ccsa: CcsaAdminTab,
};

export function getAdminTabComponent(tabId: string) {
    return adminTabComponents[tabId];
}
