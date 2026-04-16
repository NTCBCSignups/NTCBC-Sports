"use client";

import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ClipboardList, Plus, Calendar, History, RefreshCw } from "lucide-react";

interface AdminSidebarProps {
  pendingRequestCount: number;
}

const tabs = [
  { id: "requests", label: "Access Requests", icon: ClipboardList },
  { id: "create", label: "Create Session", icon: Plus },
  { id: "upcoming", label: "Upcoming Sessions", icon: Calendar },
  { id: "past", label: "Past Sessions", icon: History },
  { id: "ccsa", label: "CCSA Sync", icon: RefreshCw },
] as const;

export type AdminTab = (typeof tabs)[number]["id"];

export default function AdminSidebar({ pendingRequestCount }: AdminSidebarProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTab = (searchParams.get("tab") as AdminTab) || "upcoming";

  const navigate = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tab);
    router.push(`${pathname}?${params.toString()}`, { scroll: false });
  };

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden md:flex flex-col gap-1 w-56 shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
              activeTab === tab.id
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900",
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
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
              activeTab === tab.id
                ? "bg-gray-900 text-white"
                : "text-gray-600 bg-gray-100 hover:bg-gray-200",
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
