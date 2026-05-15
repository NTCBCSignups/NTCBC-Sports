"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface FilterOption {
    value: string;
    label: string;
    content: ReactNode;
}

interface SessionFilterProps {
    defaultValue: string;
    options: FilterOption[];
    scrollTo?: string;
}

export default function SessionFilter({
    defaultValue,
    options,
    scrollTo,
}: SessionFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        if (!scrollTo) return;
        const el = document.getElementById(`session-${scrollTo}`);
        if (el) {
            el.scrollIntoView({ block: "center" });
        }
    }, [scrollTo]);

    const handleChange = (next: string) => {
        setValue(next);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", next);
        params.delete("highlight");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-4">
            <div
                role="tablist"
                aria-label="Session filter"
                className="flex gap-3 overflow-x-auto pb-1 sm:flex-wrap"
            >
                {options.map((opt) => {
                    const selected = opt.value === value;

                    return (
                        <button
                            key={opt.value}
                            type="button"
                            role="tab"
                            aria-selected={selected}
                            onClick={() => handleChange(opt.value)}
                            className={cn(
                                "rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                selected
                                    ? "bg-stone-950 text-white shadow-sm"
                                    : "bg-gray-100 text-gray-900 hover:bg-gray-200",
                            )}
                        >
                            {opt.label}
                        </button>
                    );
                })}
            </div>

            {options.map((opt) => (
                <div key={opt.value} hidden={opt.value !== value}>
                    {opt.content}
                </div>
            ))}
        </div>
    );
}
