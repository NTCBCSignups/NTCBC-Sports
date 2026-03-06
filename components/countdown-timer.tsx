"use client";

import { useState, useEffect } from "react";
import { ArrowBigRight } from "lucide-react";

interface CountdownTimerProps {
  openTime: string;
  closeTime: string;
  isFormOpen: boolean;
}

export default function CountdownTimer({
  openTime,
  closeTime,
  isFormOpen,
}: CountdownTimerProps) {
  const [countdown, setCountdown] = useState<string>("");

  // Function to calculate countdown to next opening
  const calculateCountdown = (targetTime: string) => {
    const now = new Date().getTime();
    const targetTimeMs = new Date(targetTime).getTime();
    const difference = targetTimeMs - now;

    if (difference <= 0) {
      window.location.reload();
      return "Refreshing...";
    }

    const days = Math.floor(difference / (1000 * 60 * 60 * 24));
    const hours = Math.floor(
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60),
    );
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
  };

  // Update countdown every second when form is closed / open
  useEffect(() => {
    if (isFormOpen) {
      const interval = setInterval(() => {
        setCountdown(calculateCountdown(closeTime));
      }, 1000);

      // Initial countdown calculation
      setCountdown(calculateCountdown(closeTime));

      return () => clearInterval(interval);
    } else {
      const interval = setInterval(() => {
        setCountdown(calculateCountdown(openTime));
      }, 1000);

      // Initial countdown calculation
      setCountdown(calculateCountdown(openTime));

      return () => clearInterval(interval);
    }
  }, [openTime, closeTime, isFormOpen]);

  return (
    <div className="flex items-start gap-2 text-sm">
      <ArrowBigRight className="h-4 w-4 shrink-0 mt-0.5 text-gray-700" />
      <div className="flex flex-col">
        <span className="font-medium text-gray-900">
          {isFormOpen ? "Sign-ups close in" : "Sign-ups open in"}
        </span>
        <span className="font-mono text-blue-500">{countdown}</span>
      </div>
    </div>
  );
}
