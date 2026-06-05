"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import SessionTabPills from "@/components/sports/session-tab-pills";

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
        window.history.replaceState(null, "", `?${params.toString()}`);
    };

    return (
        <div className="space-y-4">
            {showFilters && (
                <SessionTabPills
                    tabs={options.map((opt) => ({ value: opt.value, label: opt.label }))}
                    activeValue={value}
                    onSelect={handleChange}
                />
            )}

            {options.map((opt) =>
                opt.value === value ? (
                    <div key={opt.value}>{opt.content}</div>
                ) : null,
            )}
        </div>
    );
}
