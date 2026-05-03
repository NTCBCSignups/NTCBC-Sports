export function formatDate(
    dateStr: string,
    weekday: "short" | "long" = "short",
    includeYear = false,
): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
        weekday,
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" as const } : {}),
    });
}

export function formatTime(time: string): string {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

export function formatTimestamp(raw: string): string {
    if (!raw) return "";
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
}

export function formatDateTimeWithWeekday(
    raw: string,
    weekday: "short" | "long",
): string {
    const date = new Date(raw);
    if (isNaN(date.getTime())) return raw;
    const dateStr = date.toLocaleString("en-US", {
        weekday,
        year: "numeric",
        month: "short",
        day: "numeric",
    });
    const timeStr = date.toLocaleString("en-US", {
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
    });
    return `${dateStr} at ${timeStr}`;
}

export function displayName(profile: { full_name: string | null; email: string | null } | null): string {
    return profile?.full_name ?? profile?.email ?? "Unknown";
}
