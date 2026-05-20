/**
 * Shared design tokens and style constants.
 * Colors reference CSS variables defined in globals.css — they adapt to
 * light/dark mode automatically with no explicit dark: overrides needed.
 */

// ── Semantic color classes ───────────────────────────────────────
export const colors = {
    success: "text-success",
    successHover: "text-success hover:text-success/80",
    warning: "text-warning",
    warningHover: "text-warning hover:text-warning/80",
    destructive: "text-destructive",
    destructiveHover: "text-destructive hover:text-destructive/80",
} as const;

// ── Feedback message classes ─────────────────────────────────────
export const feedback = {
    success: "text-sm text-success font-medium",
    error: "text-sm text-destructive",
} as const;

// ── Status background palettes (for badges, banners, etc.) ──────
export const statusColors = {
    info: {
        bg: "bg-status-info",
        text: "text-status-info-foreground",
        border: "border-status-info-border",
    },
    green: {
        bg: "bg-status-success",
        text: "text-status-success-foreground",
        border: "border-status-success-border",
    },
    amber: {
        bg: "bg-status-warning",
        text: "text-status-warning-foreground",
        border: "border-status-warning-border",
    },
    red: {
        bg: "bg-status-destructive",
        text: "text-status-destructive-foreground",
        border: "border-status-destructive-border",
    },
} as const;

// ── Accent classes ───────────────────────────────────────────────
export const accent = {
    countdown: "font-mono text-info",
} as const;

// ── Sonner toast palettes ───────────────────────────────────────
// Match the StatusBadge palette so confirmed/waitlist/error toasts
// look like their corresponding pills.
export const toastClasses = {
    green:
        "!border-status-success-border !bg-status-success !text-status-success-foreground [&_[data-title]]:!text-status-success-foreground",
    amber:
        "!border-status-warning-border !bg-status-warning !text-status-warning-foreground [&_[data-title]]:!text-status-warning-foreground",
    red:
        "!border-status-destructive-border !bg-status-destructive !text-status-destructive-foreground [&_[data-title]]:!text-status-destructive-foreground",
} as const;
