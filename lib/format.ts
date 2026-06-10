export function formatDate(
    dateStr: string,
    weekday: "short" | "long" = "short",
    includeYear = false,
): string {
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts.map(Number);
    if (!year || !month || !day || month < 1 || month > 12 || day < 1 || day > 31) {
        return dateStr;
    }
    const date = new Date(year, month - 1, day);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
        weekday,
        month: "short",
        day: "numeric",
        ...(includeYear ? { year: "numeric" as const } : {}),
    });
}

export function formatTime(time: string): string {
    const parts = time.split(":");
    if (parts.length < 2) return time;
    const [h, m] = parts;
    const hour = parseInt(h!);
    if (isNaN(hour)) return time;
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
