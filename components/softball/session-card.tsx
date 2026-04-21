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
import { formatDate, formatTime } from "@/lib/format";
import type { SportSession } from "@/lib/supabase/types";

interface SessionCardProps {
  session: SportSession & { signup_count: number };
}

function getSignupStatus(session: SportSession): {
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline";
} {
  const now = new Date();
  const open = session.signup_open ? new Date(session.signup_open) : null;
  const close = session.signup_close ? new Date(session.signup_close) : null;

  if (open && now < open) return { label: "Opens soon", variant: "secondary" };
  if (close && now > close) return { label: "Closed", variant: "outline" };
  return { label: "Open", variant: "default" };
}

export default function SessionCard({ session }: SessionCardProps) {
  const status = getSignupStatus(session);
  const now = new Date();
  const isOpen =
    (!session.signup_open || now >= new Date(session.signup_open)) &&
    (!session.signup_close || now <= new Date(session.signup_close));

  return (
    <Link href={`/${session.sport}/session/${session.id}`} className="block h-full">
      <Card className="flex h-full flex-col overflow-hidden transition-shadow hover:shadow-lg">
        <CardHeader className="pb-1.5">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-xl leading-tight">
              {session.title || formatDate(session.date)}
            </CardTitle>
            <Badge variant={status.variant} className="shrink-0">
              {status.label}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col space-y-1.5 text-sm text-gray-700">
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
          {session.signup_open && session.signup_close && (
            <CountdownTimer
              openTime={session.signup_open}
              closeTime={session.signup_close}
              isFormOpen={isOpen}
            />
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
