import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSportRole } from "@/lib/supabase/user";
import { getFirstUnmetLevel } from "@/lib/tab-access";
import { sessionsToIcal } from "@/lib/calendar-export";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { AccessLevel } from "@/config/config-resolver";
import { SPORT_TIMEZONE } from "@/lib/timezone";
import { formatInTimeZone } from "date-fns-tz";
import type { SportSession } from "@/lib/supabase/types";

function getTodayString(): string {
    return formatInTimeZone(new Date(), SPORT_TIMEZONE, "yyyy-MM-dd");
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ sport: string }> },
) {
    const { sport } = await params;
    const { searchParams } = request.nextUrl;

    const userId = searchParams.get("userId");
    const mode = searchParams.get("mode") ?? "subscribe";
    const tab = searchParams.get("tab");
    const includeHistory = searchParams.get("history") === "true";

    // ── Validate sport ───────────────────────────────────────────
    const config = await getResolvedSportConfig(sport);
    if (!config) {
        return NextResponse.json({ error: "Sport not found" }, { status: 404 });
    }

    // ── Validate userId ──────────────────────────────────────────
    if (!userId) {
        return NextResponse.json(
            { error: "Missing userId parameter" },
            { status: 403 },
        );
    }

    const supabase = createAdminClient();

    // Verify user exists
    const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("id", userId)
        .single();

    if (!profile) {
        return NextResponse.json(
            { error: "Invalid userId" },
            { status: 403 },
        );
    }

    // ── Resolve user role & visible tabs ─────────────────────────
    const { role } = await getUserSportRole(supabase, userId, sport);

    const visibleTabs = config.tabs.filter(
        (t) => getFirstUnmetLevel(t, role) !== AccessLevel.overview,
    );
    const visibleTypes = new Set(visibleTabs.map((t) => t.value));

    // Validate requested tab filter
    if (tab && !visibleTypes.has(tab)) {
        return NextResponse.json(
            { error: "You don't have access to this session type" },
            { status: 403 },
        );
    }

    // ── Fetch sessions ───────────────────────────────────────────
    const isDownload = mode === "download";
    const fetchHistory = isDownload && includeHistory;

    let query = supabase
        .from("sessions")
        .select("*")
        .eq("sport", sport);

    if (!fetchHistory) {
        query = query.gte("date", getTodayString());
    }

    query = query.order("date", { ascending: true });

    const { data: sessions } = await query.returns<SportSession[]>();
    if (!sessions) {
        return new Response(
            sessionsToIcal([], {
                calendarName: `NTCBC ${config.name} Sessions`,
                includeCancelled: !isDownload,
            }),
            { status: 200, headers: buildHeaders(config.name, sport, isDownload) },
        );
    }

    // ── Filter by access + tab ───────────────────────────────────
    let filtered = sessions.filter((s) => visibleTypes.has(s.session_type));
    if (tab) {
        filtered = filtered.filter((s) => s.session_type === tab);
    }

    // ── Generate iCal ────────────────────────────────────────────
    const calendarName = tab
        ? `NTCBC ${config.name} - ${visibleTabs.find((t) => t.value === tab)?.label ?? tab}`
        : `NTCBC ${config.name} Sessions`;

    const ical = sessionsToIcal(filtered, {
        calendarName,
        includeCancelled: !isDownload,
    });

    return new Response(ical, {
        status: 200,
        headers: buildHeaders(config.name, sport, isDownload),
    });
}

function buildHeaders(
    sportName: string,
    sport: string,
    isDownload: boolean,
): HeadersInit {
    const headers: HeadersInit = {
        "Content-Type": "text/calendar; charset=utf-8",
        "Cache-Control": "no-cache, no-store, must-revalidate",
    };

    if (isDownload) {
        const filename = `ntcbc-${sport}-sessions.ics`;
        headers["Content-Disposition"] = `attachment; filename="${filename}"`;
    }

    return headers;
}
