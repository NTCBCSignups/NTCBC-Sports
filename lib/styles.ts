/**
 * Shared design tokens and style constants.
 * Import from here instead of hardcoding colors across components.
 */

// ── Semantic color classes ───────────────────────────────────────
export const colors = {
    success: "text-green-600",
    successHover: "text-green-600 hover:text-green-700",
    warning: "text-amber-600",
    warningHover: "text-amber-600 hover:text-amber-700",
    destructive: "text-red-600",
    destructiveHover: "text-red-600 hover:text-red-700",
} as const;

// ── Feedback message classes ─────────────────────────────────────
export const feedback = {
    success: "text-sm text-green-600 font-medium",
    error: "text-sm text-red-600",
} as const;

// ── Status background palettes (for badges, banners, etc.) ──────
export const statusColors = {
    green: {
        bg: "bg-green-50",
        text: "text-green-600",
        border: "border-green-200",
    },
    amber: {
        bg: "bg-amber-50",
        text: "text-amber-600",
        border: "border-amber-200",
    },
    red: {
        bg: "bg-red-50",
        text: "text-red-600",
        border: "border-red-200",
    },
} as const;
