"use client";

import { useState, useEffect } from "react";
import { ArrowBigRight, RefreshCcw } from "lucide-react";

interface CountdownTimerProps {
  openTime: string;
  isFormOpen: boolean;
}

export default function CountdownTimer({
  openTime,
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
      (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
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

  // Update countdown every second when form is closed
  useEffect(() => {
    if (!isFormOpen) {
      const interval = setInterval(() => {
        setCountdown(calculateCountdown(openTime));
      }, 1000);

      // Initial countdown calculation
      setCountdown(calculateCountdown(openTime));

      return () => clearInterval(interval);
    }
  }, [openTime, isFormOpen]);

  // Don't render anything if form is open
  if (isFormOpen) return null;

  return (
    <>
      <div className="flex gap-6 text-sm text-gray-500 mb-2">
        <div className="flex items-center gap-2">
          <ArrowBigRight className="h-4 w-4" />
          <span>Next registration opens in: </span>
          <span className="font-mono text-blue-500">{countdown}</span>
        </div>
      </div>
    </>
  );
}
