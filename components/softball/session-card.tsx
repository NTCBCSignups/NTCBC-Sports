"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import CountdownTimer from "@/components/countdown-timer";
import type { SportSession } from "@/lib/supabase/types";

interface SessionCardProps {
  session: SportSession & { signup_count: number };
}

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function formatTime(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${m} ${ampm}`;
}

function getSignupStatus(session: SportSession): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const now = new Date();
  const open = new Date(session.signup_open);
  const close = new Date(session.signup_close);

  if (now < open)
    return { label: "Opens soon", variant: "secondary" };
  if (now >= open && now <= close)
    return { label: "Open", variant: "default" };
  return { label: "Closed", variant: "outline" };
}

export default function SessionCard({ session }: SessionCardProps) {
  const status = getSignupStatus(session);
  const now = new Date();
  const isOpen =
    now >= new Date(session.signup_open) &&
    now <= new Date(session.signup_close);

  return (
    <Link href={`/softball/session/${session.id}`}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">
              {session.title || formatDate(session.date)}
            </CardTitle>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-gray-700">
          {session.title && (
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 shrink-0" />
              <span>{formatDate(session.date)}</span>
            </div>
          )}
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0" />
            <span>
              {formatTime(session.time_start)} –{" "}
              {formatTime(session.time_end)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span>{session.location_name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {session.signup_count}{session.player_cap ? ` / ${session.player_cap}` : " signed up"}
            </span>
          </div>
          <CountdownTimer
            openTime={session.signup_open}
            closeTime={session.signup_close}
            isFormOpen={isOpen}
          />
        </CardContent>
      </Card>
    </Link>
  );
}
