"use client";

interface LocalTimestampProps {
    date: string;
    weekday?: "short" | "long";
}

export default function LocalTimestamp({ date, weekday }: LocalTimestampProps) {
    const d = new Date(date);

    if (weekday) {
        const dateStr = d.toLocaleString("en-US", {
            weekday,
            year: "numeric",
            month: "short",
            day: "numeric",
        });
        const timeStr = d.toLocaleString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
        });
        return (
            <time dateTime={date}>
                {dateStr} at {timeStr}
            </time>
        );
    }

    return (
        <time dateTime={date}>
            {d.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })}
        </time>
    );
}
