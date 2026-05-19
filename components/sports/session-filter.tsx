"use client";

import { useEffect, useRef, useState } from "react";
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
    sport: string;
    showFilters?: boolean;
}

export default function SessionFilter({
    defaultValue,
    options,
    scrollTo,
    sport,
    showFilters = true,
}: SessionFilterProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [value, setValue] = useState(defaultValue);
    const didRestoreScroll = useRef(false);

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);

    useEffect(() => {
        if (didRestoreScroll.current) return;
        didRestoreScroll.current = true;

        const scrollSessionId = (() => {
            if (scrollTo) return scrollTo;

            const stored = sessionStorage.getItem(`last-session:${sport}`);
            if (!stored) return null;

            try {
                const parsed = JSON.parse(stored) as {
                    sessionId?: string;
                    tab?: string;
                };

                if (parsed.tab !== value) return null;
                return parsed.sessionId ?? null;
            } catch {
                return null;
            }
        })();

        sessionStorage.removeItem(`last-session:${sport}`);

        if (!scrollSessionId) return;

        requestAnimationFrame(() => {
            const el = document.getElementById(`session-${scrollSessionId}`);
            if (el) {
                el.scrollIntoView({ block: "center" });
            }
        });
    }, [scrollTo, sport, value]);

    const handleChange = (next: string) => {
        setValue(next);
        const params = new URLSearchParams(searchParams.toString());
        params.set("tab", next);
        params.delete("highlight");
        router.replace(`?${params.toString()}`, { scroll: false });
    };

    return (
        <div className="space-y-4">
            {showFilters && (
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
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "bg-muted text-foreground hover:bg-accent",
                                )}
                            >
                                {opt.label}
                            </button>
                        );
                    })}
                </div>
            )}

            {options.map((opt) =>
                opt.value === value ? (
                    <div key={opt.value}>{opt.content}</div>
                ) : null,
            )}
        </div>
    );
}
