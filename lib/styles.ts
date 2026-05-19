/**
 * Shared design tokens and style constants.
 * Import from here instead of hardcoding colors across components.
 */

// ── Semantic color classes ───────────────────────────────────────
export const colors = {
    success: "text-green-600 dark:text-green-400",
    successHover: "text-green-600 hover:text-green-700 dark:text-green-400 dark:hover:text-green-300",
    warning: "text-amber-600 dark:text-amber-400",
    warningHover: "text-amber-600 hover:text-amber-700 dark:text-amber-400 dark:hover:text-amber-300",
    destructive: "text-red-600 dark:text-red-400",
    destructiveHover: "text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300",
} as const;

// ── Feedback message classes ─────────────────────────────────────
export const feedback = {
    success: "text-sm text-green-600 dark:text-green-400 font-medium",
    error: "text-sm text-red-600 dark:text-red-400",
} as const;

// ── Status background palettes (for badges, banners, etc.) ──────
export const statusColors = {
    green: {
        bg: "bg-green-50 dark:bg-green-950",
        text: "text-green-600 dark:text-green-400",
        border: "border-green-200 dark:border-green-800",
    },
    amber: {
        bg: "bg-amber-50 dark:bg-amber-950",
        text: "text-amber-600 dark:text-amber-400",
        border: "border-amber-200 dark:border-amber-800",
    },
    red: {
        bg: "bg-red-50 dark:bg-red-950",
        text: "text-red-600 dark:text-red-400",
        border: "border-red-200 dark:border-red-800",
    },
} as const;

// ── Accent classes ───────────────────────────────────────────────
export const accent = {
    countdown: "font-mono text-blue-500 dark:text-blue-400",
} as const;

// ── Sonner toast palettes ───────────────────────────────────────
// Match the StatusBadge palette so confirmed/waitlist/error toasts
// look like their corresponding pills.
export const toastClasses = {
    green:
        "!border-green-200 !bg-green-100 !text-green-800 [&_[data-title]]:!text-green-800 dark:!border-green-800 dark:!bg-green-950 dark:!text-green-200 dark:[&_[data-title]]:!text-green-200",
    amber:
        "!border-amber-200 !bg-amber-100 !text-amber-800 [&_[data-title]]:!text-amber-800 dark:!border-amber-800 dark:!bg-amber-950 dark:!text-amber-200 dark:[&_[data-title]]:!text-amber-200",
    red:
        "!border-red-200 !bg-red-100 !text-red-800 [&_[data-title]]:!text-red-800 dark:!border-red-800 dark:!bg-red-950 dark:!text-red-200 dark:[&_[data-title]]:!text-red-200",
} as const;
