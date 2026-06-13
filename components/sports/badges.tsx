"use client";

import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert } from "lucide-react";
import { colors } from "@/lib/styles";
import type { WaiverStatus } from "@/lib/supabase/types";

// ── StatusBadge ──────────────────────────────────────────────────

const statusVariants = {
  confirmed:
    "bg-status-success text-status-success-foreground border-status-success-border hover:bg-status-success",
  waitlisted:
    "bg-status-warning text-status-warning-foreground border-status-warning-border hover:bg-status-warning",
  pending:
    "bg-status-warning text-status-warning-foreground border-status-warning-border hover:bg-status-warning",
  approved:
    "bg-status-success text-status-success-foreground border-status-success-border hover:bg-status-success",
  rejected:
    "bg-status-destructive text-status-destructive-foreground border-status-destructive-border hover:bg-status-destructive",
  cancelled: "bg-muted text-foreground border-border hover:bg-muted",
  declined:
    "bg-status-destructive/50 text-status-destructive-foreground border-status-destructive-border hover:bg-status-destructive/50",
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
    <Badge className={statusVariants[status]}>{label ?? statusLabels[status] ?? status}</Badge>
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
    <span
      className={`inline-flex items-center gap-1 ${colors.warning}`}
      title={waiverLabels[status]}
    >
      <ShieldAlert className="h-4 w-4 shrink-0" />
      {showLabel && waiverLabels[status]}
    </span>
  );
}
