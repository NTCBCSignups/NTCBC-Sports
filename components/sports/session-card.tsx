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
import { sessionTypePillClass } from "@/lib/session-type-pill";
import { resolvedSportsConfig, getResolvedTab, AccessLevel, Role } from "@/config/config-resolver";
import { SESSION_STATUS } from "@/lib/supabase/types";
import type { SignupStatus, SportSession } from "@/lib/supabase/types";

interface SessionCardProps {
  session: SportSession & { signup_count: number };
  highlighted?: boolean;
  userSignupStatus?: SignupStatus | null;
  returnTab?: string;
  userRole?: Role;
}

function getSignupStatus(session: SportSession): {
  label: string;
  variant: "default" | "secondary" | "outline" | "destructive";
} {
  if (session.status === SESSION_STATUS.cancelled) return { label: "Cancelled", variant: "destructive" };

  const now = new Date();
  const open = session.signup_open ? new Date(session.signup_open) : null;
  const close = session.signup_close ? new Date(session.signup_close) : null;

  if (open && now < open) return { label: "Opens soon", variant: "secondary" };
  if (close && now > close) return { label: "Closed", variant: "outline" };
  return { label: "Open", variant: "default" };
}

export default function SessionCard({
  session,
  highlighted,
  userSignupStatus,
  returnTab,
  userRole,
}: SessionCardProps) {
  const isOpen = isSignupOpen(session);
  const status = getSignupStatus(session);
  const sportConfig = resolvedSportsConfig[session.sport];
  const tab = getResolvedTab(sportConfig, session.session_type);
  const canView = userRole === undefined || userRole >= tab.permissions[AccessLevel.view];
  const canSignup = userRole === undefined || userRole >= tab.permissions[AccessLevel.signup];
  const href = returnTab
    ? `/${session.sport}/session/${session.id}?fromTab=${encodeURIComponent(returnTab)}`
    : `/${session.sport}/session/${session.id}`;
  const sessionTypeLabel = tab.label;
  const prefix = tab.defaultTitlePrefix ?? sessionTypeLabel;
  const fallbackTitle = `${prefix}: ${formatDate(session.date, "short", true)}`;
  const displayTitle = session.title || fallbackTitle;

  const isCancelled = session.status === SESSION_STATUS.cancelled;

  const card = (
    <Card className={cn(
      "relative flex h-full flex-col gap-2 overflow-hidden transition-shadow",
      canView && "hover:shadow-lg",
      !canView && "opacity-60 cursor-default",
      isCancelled && "opacity-60",
      highlighted && "ring-2 ring-info bg-status-info/50",
    )}>
      {canView && (
        <Link
          href={href}
          onClick={() => {
            if (!returnTab) return;
            sessionStorage.setItem(
              `last-session:${session.sport}`,
              JSON.stringify({ sessionId: session.id, tab: returnTab }),
            );
          }}
          className="absolute inset-0 z-10"
          aria-label={`View ${displayTitle} details`}
        />
      )}
      <CardHeader className="relative z-20 pb-0 pointer-events-none">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-2">
            <CardTitle className="text-xl leading-tight">
              {displayTitle}
            </CardTitle>
            <Badge
              variant="outline"
              className={cn(
                "rounded-full border font-normal shadow-none",
                sessionTypePillClass(sportConfig, session.session_type),
              )}
            >
              {sessionTypeLabel}
            </Badge>
          </div>
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {(userSignupStatus === "confirmed" ||
              userSignupStatus === "waitlisted" ||
              userSignupStatus === "declined") && (
                <StatusBadge status={userSignupStatus} />
              )}
            {canSignup && (
              <Badge variant={status.variant} className="shrink-0">
                {status.label}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-20 flex flex-1 flex-col space-y-1.5 text-sm text-muted-foreground pointer-events-none">
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
        {canSignup && (
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0" />
            <span>
              {session.signup_count}{session.player_cap ? ` / ${session.player_cap}` : " signed up"}
            </span>
          </div>
        )}
        {canSignup && !isCancelled && session.signup_open && session.signup_close && (
          <CountdownTimer
            openTime={session.signup_open}
            closeTime={session.signup_close}
            isFormOpen={isOpen}
          />
        )}
      </CardContent>
    </Card>
  );

  return (
    <div id={`session-${session.id}`} className="block h-full">
      {card}
    </div>
  );
}
