"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { colors } from "@/lib/styles";
import type { WaiverStatus } from "@/lib/supabase/types";

// ── StatusBadge ──────────────────────────────────────────────────

const statusVariants = {
    confirmed: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    waitlisted: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    pending: "bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-100",
    approved: "bg-green-100 text-green-800 border-green-200 hover:bg-green-100",
    rejected: "bg-red-100 text-red-800 border-red-200 hover:bg-red-100",
    cancelled: "bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-100",
    declined: "bg-red-50 text-red-700 border-red-200 hover:bg-red-50",
} as const;

const statusLabels: Record<string, string> = {
    confirmed: "Confirmed",
    waitlisted: "Waitlist",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    cancelled: "Cancelled",
    declined: "Unable to join",
};

interface StatusBadgeProps {
    status: keyof typeof statusVariants;
    label?: string;
}

export function StatusBadge({ status, label }: StatusBadgeProps) {
    return (
        <Badge className={statusVariants[status]}>
            {label ?? statusLabels[status] ?? status}
        </Badge>
    );
}

// ── TeamMemberBadge ──────────────────────────────────────────────

export function TeamMemberBadge() {
    return (
        <span className={`flex items-center justify-center ${colors.success}`} title="Team member">
            <ShieldCheck className="h-4 w-4" />
        </span>
    );
}

// ── WaiverBadge ──────────────────────────────────────────────────

const waiverLabels: Record<WaiverStatus, string> = {
    valid: "Valid",
    needs_paper: "Needs Paper",
    needs_online: "Needs Online",
};

interface WaiverBadgeProps {
    status: WaiverStatus;
    showLabel?: boolean;
}

export function WaiverBadge({ status, showLabel = true }: WaiverBadgeProps) {
    if (status === "valid") {
        return (
            <span className={`inline-flex items-center gap-1 ${colors.success}`} title="Waiver signed">
                <ShieldCheck className="h-4 w-4" />
                {showLabel && waiverLabels[status]}
            </span>
        );
    }

    return (
        <span className={`inline-flex items-center gap-1 ${colors.warning}`} title={waiverLabels[status]}>
            <ShieldAlert className="h-4 w-4 shrink-0" />
            {showLabel && waiverLabels[status]}
        </span>
    );
}
