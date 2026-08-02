"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useOptimistic, useTransition, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { type LucideIcon } from "lucide-react";
import type { AdminTabMeta } from "@/config/config-resolver";
import { LoadingAdminContent } from "@/components/sports/loading-content";
import { getAdminTabIcon } from "@/components/sports/admin/admin-tab-icons";

interface SidebarTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminLayoutProps {
  pendingRequestCount: number;
  badgeTabId?: string;
  tabs: AdminTabMeta[];
  defaultTab: string;
  children: ReactNode;
}

export default function AdminLayout({
  pendingRequestCount,
  badgeTabId = "people",
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
      {/* Desktop sidebar — sticky, themed panel with grouped menu items */}
      <nav
        className="hidden md:flex flex-col gap-1 w-56 shrink-0 sticky top-6 self-start"
        role="navigation"
        aria-label="Admin navigation"
      >
        <div className="rounded-xl border bg-card/50 p-2 space-y-1">
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={cn(
                "flex items-center gap-2.5 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-left",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">{tab.label}</span>
              {tab.id === badgeTabId && pendingRequestCount > 0 && (
                <Badge
                  variant={activeTab === tab.id ? "secondary" : "destructive"}
                  className="h-5 min-w-5 flex items-center justify-center px-1.5 text-xs"
                >
                  {pendingRequestCount}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Mobile horizontal tabs — 44px touch targets per Apple HIG / WCAG 2.5.5 */}
      <div className="md:hidden relative">
        <nav
          className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="navigation"
          aria-label="Admin navigation"
        >
          {allTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors min-h-[44px]",
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground bg-muted hover:bg-accent",
              )}
            >
              <tab.icon className="h-4 w-4 shrink-0" />
              {tab.label}
              {tab.id === badgeTabId && pendingRequestCount > 0 && (
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
        {/* Scroll fade hint */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-2 w-8 bg-gradient-to-l from-background to-transparent" />
      </div>

      {/* Content area — show loading instantly on tab switch */}
      <div className="flex-1 min-w-0">
        {isPending && <LoadingAdminContent />}
        {!isPending && children}
      </div>
    </>
  );
}
