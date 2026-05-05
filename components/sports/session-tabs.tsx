"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { ReactNode } from "react";

interface Tab {
    value: string;
    label: string;
    content: ReactNode;
}

interface SessionTabsProps {
    defaultTab: string;
    tabs: Tab[];
    scrollTo?: string;
}

export default function SessionTabs({
    defaultTab,
    tabs,
    scrollTo,
}: SessionTabsProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    useEffect(() => {
        if (!scrollTo) return;
        const el = document.getElementById(`session-${scrollTo}`);
        if (el) {
            el.scrollIntoView({ block: "center" });
        }
    }, [scrollTo]);

    const handleTabChange = (value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", value);
        params.delete("highlight");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <Tabs defaultValue={defaultTab} onValueChange={handleTabChange} className="gap-4">
            <TabsList className="max-sm:w-full rounded-full">
                {tabs.map((tab) => (
                    <TabsTrigger
                        key={tab.value}
                        value={tab.value}
                        className="max-sm:flex-1 rounded-full px-5"
                    >
                        {tab.label}
                    </TabsTrigger>
                ))}
            </TabsList>

            {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="space-y-4">
                    {tab.content}
                </TabsContent>
            ))}
        </Tabs>
    );
}
