"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList, Plus, Calendar, History,
  RefreshCw, type LucideIcon,
} from "lucide-react";
import type { AdminTabMeta } from "@/config/config-resolver";

/** Map from iconName strings in sports-config to actual Lucide components. */
const iconMap: Record<string, LucideIcon> = {
  ClipboardList,
  Plus,
  Calendar,
  History,
  RefreshCw,
};

interface SidebarTab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface AdminSidebarProps {
  pendingRequestCount: number;
  tabs: AdminTabMeta[];
}

export default function AdminSidebar({ pendingRequestCount, tabs }: AdminSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const allTabs: SidebarTab[] = tabs.map((t) => ({
    id: t.id,
    label: t.label,
    icon: iconMap[t.iconName] ?? Calendar,
  }));

  const activeTab = searchParams.get("tab") || "upcoming";

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
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
    </>
  );
}
