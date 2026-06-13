"use client";

import { useEffect, useState } from "react";
import { formatTimestamp, formatDateTimeWithWeekday } from "@/lib/format";

interface LocalTimestampProps {
  date: string;
  weekday?: "short" | "long";
}

export default function LocalTimestamp({ date, weekday }: LocalTimestampProps) {
  const [formatted, setFormatted] = useState("");

  useEffect(() => {
    setFormatted(weekday ? formatDateTimeWithWeekday(date, weekday) : formatTimestamp(date));
  }, [date, weekday]);

  return <time dateTime={date}>{formatted}</time>;
}
