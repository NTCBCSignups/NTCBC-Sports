"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/sports/badges";
import { CalendarDays, Clock, MapPin, Users } from "lucide-react";
import CountdownTimer from "@/components/sports/countdown-timer";
import { formatDate, formatTime } from "@/lib/format";
import { isSignupOpen } from "@/lib/signup-capacity";
import { cn } from "@/lib/utils";
import type { SignupStatus, SportSession } from "@/lib/supabase/types";

interface SessionCardProps {
  session: SportSession & { signup_count: number };
  linkDisabled?: boolean;
  highlighted?: boolean;
  userSignupStatus?: SignupStatus | null;
}

function getSignupStatus(session: SportSession): {
  label: string;
  variant: "default" | "secondary" | "outline";
} {
  const now = new Date();
  const open = session.signup_open ? new Date(session.signup_open) : null;
  const close = session.signup_close ? new Date(session.signup_close) : null;

  if (open && now < open) return { label: "Opens soon", variant: "secondary" };
  if (close && now > close) return { label: "Closed", variant: "outline" };
  return { label: "Open", variant: "default" };
}

const sessionTypeLabels: Record<string, string> = {
  drop_in_practice: "Practice",
  scheduled_game: "Game",
};

export default function SessionCard({
  session,
  linkDisabled,
  highlighted,
  userSignupStatus,
}: SessionCardProps) {
  const isOpen = isSignupOpen(session);
  const status = linkDisabled
    ? { label: "Upcoming", variant: "secondary" as const }
    : getSignupStatus(session);
  const href = `/${session.sport}/session/${session.id}`;
  const fallbackTitle = `${sessionTypeLabels[session.session_type] ?? "Session"
    }: ${formatDate(session.date, "short", true)}`;
  const displayTitle = session.title || fallbackTitle;

  const card = (
    <Card className={cn(
      "relative flex h-full flex-col gap-2 overflow-hidden transition-shadow",
      !linkDisabled && "hover:shadow-lg",
      highlighted && "ring-2 ring-blue-500 bg-blue-50/50",
    )}>
      {!linkDisabled && (
        <Link
          href={href}
          className="absolute inset-0 z-10"
          aria-label={`View ${displayTitle} details`}
        />
      )}
      <CardHeader className="relative z-20 pb-0 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-xl leading-tight">
              {displayTitle}
            </CardTitle>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {(userSignupStatus === "confirmed" ||
              userSignupStatus === "waitlisted") && (
                <StatusBadge status={userSignupStatus} />
              )}
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-20 flex flex-1 flex-col space-y-1.5 text-sm text-gray-700 pointer-events-none">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="font-semibold">{formatDate(session.date, "short", true)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="font-semibold">
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
        {!linkDisabled && session.signup_open && session.signup_close && (
          <CountdownTimer
            openTime={session.signup_open}
            closeTime={session.signup_close}
            isFormOpen={isOpen}
          />
        )}
      </CardContent>
    </Card>
  );

  if (linkDisabled) {
    return <div className="block h-full">{card}</div>;
  }

  return (
    <div className="block h-full">
      {card}
    </div>
  );
}
