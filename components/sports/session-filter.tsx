"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import type { ReactNode } from "react";

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
            <Select value={value} onValueChange={handleChange}>
                <SelectTrigger className="w-full sm:w-64 rounded-full px-5">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {options.map((opt) => (
                <div key={opt.value} hidden={opt.value !== value}>
                    {opt.content}
                </div>
            ))}
        </div>
    );
}
