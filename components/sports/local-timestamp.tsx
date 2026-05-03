"use client";

import { formatTimestamp, formatDateTimeWithWeekday } from "@/lib/format";

interface LocalTimestampProps {
    date: string;
    weekday?: "short" | "long";
}

export default function LocalTimestamp({ date, weekday }: LocalTimestampProps) {
    const formatted = weekday
        ? formatDateTimeWithWeekday(date, weekday)
        : formatTimestamp(date);

    return <time dateTime={date}>{formatted}</time>;
}
