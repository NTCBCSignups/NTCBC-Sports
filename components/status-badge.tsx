"use client";

import { Badge } from "@/components/ui/badge";

const variants = {
    confirmed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    waitlisted: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    pending: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    approved: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    rejected: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
} as const;

const labels: Record<string, string> = {
    confirmed: "Confirmed",
    waitlisted: "Waitlist",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
};

interface StatusBadgeProps {
    status: keyof typeof variants;
    label?: string;
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
    return (
        <Badge className={variants[status]}>
            {label ?? labels[status] ?? status}
        </Badge>
    );
}
