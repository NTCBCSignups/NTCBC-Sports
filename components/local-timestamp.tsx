"use client";

export default function LocalTimestamp({ date }: { date: string }) {
    return (
        <time dateTime={date}>
            {new Date(date).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
            })}
        </time>
    );
}
