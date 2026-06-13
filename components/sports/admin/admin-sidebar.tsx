"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type LucideIcon } from "lucide-react";
import type { AdminTabMeta } from "@/config/config-resolver";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import { getAdminTabIcon } from "@/components/sports/admin/admin-tab-icons";
import {
  clearUnsavedSettingsChanges,
  confirmLeaveWithUnsavedSettings,
} from "@/components/sports/admin/settings-unsaved-guard";

interface SidebarTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminLayoutProps {
  pendingRequestCount: number;
  tabs: AdminTabMeta[];
  defaultTab: string;
  children: ReactNode;
}

export default function AdminLayout({
  pendingRequestCount,
  tabs,
  defaultTab,
  children,
}: AdminLayoutProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const requestedTab = searchParams.get("tab");
  const resolvedTab =
    requestedTab && tabs.some((tab) => tab.id === requestedTab) ? requestedTab : defaultTab;
  const serverTab = resolvedTab;
  const [activeTab, setActiveTab] = useOptimistic(serverTab);

  const allTabs: SidebarTab[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    icon: getAdminTabIcon(t.iconName),
  }));

  const navigate = (tab: string) => {
    if (tab === activeTab) {
      return;
    }

    if (!confirmLeaveWithUnsavedSettings()) {
      return;
    }

    clearUnsavedSettingsChanges();

    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    const url = `${pathname}?${params.toString()}`;
    window.history.replaceState(null, "", url);
    startTransition(() => {
      setActiveTab(tab);
      router.replace(url, { scroll: false });
    });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            <span className="flex-1">{tab.label}</span>
            {tab.id === "requests" && pendingRequestCount > 0 && (
              <Badge
                variant={activeTab === tab.id ? "secondary" : "destructive"}
                className="h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
              >
                {pendingRequestCount}
              </Badge>
            )}
          </button>
        ))}
      </nav>

      {/* Mobile horizontal tabs */}
      <nav className="md:hidden flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
        {allTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground bg-muted hover:bg-accent",
            )}
          >
            <tab.icon className="h-3.5 w-3.5 shrink-0" />
            {tab.label}
            {tab.id === "requests" && pendingRequestCount > 0 && (
              <Badge
                variant={activeTab === tab.id ? "secondary" : "destructive"}
                className="h-4 min-w-4 flex items-center justify-center px-1 text-[10px]"
              >
                {pendingRequestCount}
              </Badge>
            )}
          </button>
        ))}
      </nav>

      {/* Content area — show loading instantly on tab switch */}
      <div className="flex-1 min-w-0">
        {isPending && <LoadingAdminContent />}
        <div className={isPending ? "hidden" : undefined}>{children}</div>
      </div>
    </>
  );
}
