"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowBigRight } from "lucide-react";
import { accent } from "@/lib/styles";

interface CountdownTimerProps {
  openTime: string;
  closeTime: string;
  isFormOpen: boolean;
}

export default function CountdownTimer({ openTime, closeTime, isFormOpen }: CountdownTimerProps) {
  const router = useRouter();
  const [countdown, setCountdown] = useState<string>("");
  const [expired, setExpired] = useState(false);

  const targetTime = isFormOpen ? closeTime : openTime;
  const now = Date.now();
  const targetMs = new Date(targetTime).getTime();
  const closeMs = new Date(closeTime).getTime();
  const alreadyPast = targetMs <= now;
  const isClosed = closeMs <= now;

  const calculateCountdown = useCallback((target: string) => {
    const nowMs = Date.now();
    const targetTimeMs = new Date(target).getTime();
    const difference = targetTimeMs - nowMs;

    if (difference <= 0) {
      setExpired(true);
      router.refresh();
      return "Refreshing...";
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((difference % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${seconds}s`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    } else {
      return `${seconds}s`;
    }
  }, []);

  useEffect(() => {
    if (alreadyPast) return;

    setCountdown(calculateCountdown(targetTime));
    const interval = setInterval(() => {
      setCountdown(calculateCountdown(targetTime));
    }, 1000);

    return () => clearInterval(interval);
  }, [targetTime, alreadyPast, calculateCountdown]);

  if (isClosed || (alreadyPast && !expired)) {
    return (
      <div className="flex items-start gap-2 text-sm">
        <ArrowBigRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
        <span className="font-medium text-foreground">Sign-ups closed</span>
      </div>
    );
  }

  return (
    <div className="flex items-start gap-2 text-sm" role="timer" aria-live="off" aria-atomic="true">
      <ArrowBigRight className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="font-medium text-foreground">
          {isFormOpen ? "Sign-ups close in" : "Sign-ups open in"}
        </span>
        <span className={accent.countdown}>{countdown}</span>
      </div>
    </div>
  );
}
