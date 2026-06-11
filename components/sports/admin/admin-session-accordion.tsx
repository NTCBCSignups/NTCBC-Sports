import { Badge } from "@/components/ui/badge";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { CalendarDays, MapPin, Pencil } from "lucide-react";
import { getResolvedTab, type ResolvedSportConfig } from "@/config/config-resolver";
import AdminSessionSignups from "@/components/sports/admin/admin-session-signups";
import DeleteSessionButton from "@/components/sports/session/delete-session-button";
import CancelSessionButton from "@/components/sports/session/cancel-session-button";
import RestoreSessionButton from "@/components/sports/session/restore-session-button";
import SessionDialog from "@/components/sports/session/session-dialog";
import { formatDate, formatTime } from "@/lib/format";
import { sessionTypePillClass } from "@/lib/session-type-pill";
import { cn } from "@/lib/utils";
import { SESSION_STATUS } from "@/lib/supabase/types";
import type { Profile, SportSession, SignupStatus } from "@/lib/supabase/types";

export interface SessionSignupEntry {
    id: string;
    user_id: string;
    status: SignupStatus;
    created_at: string;
    profiles: Profile | null;
}

interface SessionAccordionProps {
    config: ResolvedSportConfig;
    sport: string;
    sessions: SportSession[];
    signupsBySession: Map<string, SessionSignupEntry[]>;
    teamMemberIds: Set<string>;
    muted?: boolean;
}

export default function SessionAccordion({
    config,
    sport,
    sessions,
    signupsBySession,
    teamMemberIds,
    muted,
}: SessionAccordionProps) {
    const sessionTabs = config.tabs.map((tab) => ({ value: tab.value, label: tab.label }));

    if (sessions.length === 0) {
        return (
            <p className="text-sm text-muted-foreground py-4">No sessions.</p>
        );
    }

    return (
        <Accordion type="multiple" className="space-y-2">
            {sessions.map((session) => {
                const sessionSignups =
                    signupsBySession.get(session.id) ?? [];
                const activeCount = sessionSignups.filter(
                    (s) => s.status === "confirmed",
                ).length;
                const tab = getResolvedTab(config, session.session_type);
                const sessionTypeLabel =
                    tab.defaultTitlePrefix ?? tab.label;
                const isCancelled = session.status === SESSION_STATUS.cancelled;
                const dimmed = muted || isCancelled;

                return (
                    <AccordionItem
                        key={session.id}
                        value={session.id}
                        className="border-b! rounded-lg border bg-card px-4 overflow-hidden"
                    >
                        <AccordionTrigger className="hover:no-underline py-3 min-w-0">
                            <div className="flex min-w-0 flex-1 items-start justify-between gap-3 pr-2 sm:items-center sm:pr-4">
                                <div className="min-w-0 flex-1 text-left overflow-hidden">
                                    <div
                                        className={cn(
                                            "truncate text-base font-medium sm:text-sm",
                                            dimmed && "text-muted-foreground",
                                            isCancelled && "line-through",
                                        )}
                                    >
                                        {session.title || formatDate(session.date)}
                                    </div>
                                    <div
                                        className={`mt-1 flex min-w-0 items-center gap-4 text-sm sm:gap-6 sm:text-xs ${dimmed ? "text-muted-foreground/60" : "text-muted-foreground"}`}
                                    >
                                        <span className="flex shrink-0 items-center gap-2 sm:gap-1">
                                            <CalendarDays className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
                                            {formatDate(session.date)}
                                        </span>
                                        <span className="flex min-w-0 items-center gap-2 sm:gap-1">
                                            <MapPin className="h-4 w-4 shrink-0 sm:h-3 sm:w-3" />
                                            <span className="truncate">{session.location_name}</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex shrink-0 flex-col items-end gap-1.5 sm:gap-2">
                                    <Badge
                                        variant="outline"
                                        className={cn(
                                            "rounded-full border text-xs font-normal shadow-none",
                                            sessionTypePillClass(config, session.session_type),
                                        )}
                                    >
                                        {sessionTypeLabel}
                                    </Badge>
                                    {session.status === SESSION_STATUS.cancelled ? (
                                        <Badge variant="destructive" className="text-xs rounded-full">
                                            Cancelled
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-xs">
                                            {activeCount}
                                            {session.player_cap
                                                ? ` / ${session.player_cap}`
                                                : ""}
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                            <div className="space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 text-sm text-muted-foreground">
                                        {formatTime(session.time_start)} –{" "}
                                        {formatTime(session.time_end)} ·{" "}
                                        {session.location_address}
                                    </div>
                                    <div className="flex shrink-0 items-center gap-1 -mt-1">
                                        <SessionDialog
                                            sport={sport}
                                            sessionTabs={sessionTabs}
                                            defaultTab={config.defaultTab}
                                            session={session}
                                            trigger={
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Pencil className="h-4 w-4" />
                                                    <span className="sr-only">Edit {session.title || "session"}</span>
                                                </Button>
                                            }
                                        />
                                        {session.status === SESSION_STATUS.cancelled && (
                                            <RestoreSessionButton sport={sport} sessionId={session.id} />
                                        )}
                                        {session.status !== SESSION_STATUS.cancelled && (
                                            <CancelSessionButton sport={sport} sessionId={session.id} />
                                        )}
                                        <DeleteSessionButton sport={sport} sessionId={session.id} />
                                    </div>
                                </div>
                                <AdminSessionSignups
                                    sport={sport}
                                    sessionId={session.id}
                                    signups={sessionSignups}
                                    playerCap={session.player_cap}
                                    teamMemberIds={teamMemberIds}
                                />
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
        </Accordion>
    );
}
