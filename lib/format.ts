export function formatDate(
    dateStr: string,
    weekday: "short" | "long" = "short",
): string {
    const [year, month, day] = dateStr.split("-").map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", {
        weekday,
        month: "short",
        day: "numeric",
    });
}

export function formatTime(time: string): string {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const hour12 = hour % 12 || 12;
    return `${hour12}:${m} ${ampm}`;
}

export function displayName(profile: { full_name: string | null; email: string | null } | null): string {
    return profile?.full_name ?? profile?.email ?? "Unknown";
}
