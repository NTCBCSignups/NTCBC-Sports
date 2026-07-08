import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getUserSportRole } from "@/lib/supabase/user";
import { getFirstUnmetLevel } from "@/lib/tab-access";
import { getSessionsWithClient } from "@/lib/get-data";
import { sessionsToIcal } from "@/lib/calendar-export";
import { getResolvedSportConfig } from "@/lib/get-sport-config";
import { getSessionUrl } from "@/lib/session-route";
import { resolveAnchoredFromDate } from "@/lib/timezone";
import { AccessLevel } from "@/config/config-resolver";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sport: string }> },
) {
  const { sport } = await params;
  const { searchParams } = request.nextUrl;

  const userId = searchParams.get("userId");
  const mode = searchParams.get("mode") ?? "subscribe";
  const tabFilters = searchParams.getAll("tab");
  const includeHistory = searchParams.get("history") === "true";
  const includeDeclined = searchParams.get("includeDeclined") === "true";
  const subscribedAt = searchParams.get("subscribedAt");

  // ── Validate sport ───────────────────────────────────────────
  const config = await getResolvedSportConfig(sport);
  if (!config) {
    return NextResponse.json({ error: "Sport not found" }, { status: 404 });
  }

  // ── Validate userId ──────────────────────────────────────────
  if (!userId) {
    return NextResponse.json({ error: "Missing userId parameter" }, { status: 403 });
  }

  const supabase = createAdminClient();

  // Verify user exists
  const { data: profile } = await supabase.from("profiles").select("id").eq("id", userId).single();

  if (!profile) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 403 });
  }

  // ── Resolve user role & visible tabs ─────────────────────────
  const { role } = await getUserSportRole(supabase, userId, sport);

  const visibleTabs = config.tabs.filter(
    (t) => getFirstUnmetLevel(t, role) !== AccessLevel.overview,
  );
  const visibleTypes = new Set(visibleTabs.map((t) => t.value));

  // Validate requested tab filters
  const invalidTab = tabFilters.find((t) => !visibleTypes.has(t));
  if (invalidTab) {
    return NextResponse.json(
      { error: "You don't have access to this session type" },
      { status: 403 },
    );
  }

  // ── Fetch sessions ───────────────────────────────────────────
  const isDownload = mode === "download";
  const anchoredFromDate = resolveAnchoredFromDate(subscribedAt, includeHistory);

  const sessions = await getSessionsWithClient(supabase, sport, {
    includeHistory,
    fromDate: anchoredFromDate,
  });

  // ── Filter by access + tab ───────────────────────────────────
  let filtered = sessions.filter((s) => visibleTypes.has(s.session_type));
  if (tabFilters.length > 0) {
    const tabSet = new Set(tabFilters);
    filtered = filtered.filter((s) => tabSet.has(s.session_type));
  }

  // ── Exclude sessions user declined ───────────────────────────
  if (!includeDeclined) {
    const { data: declinedSignups } = await supabase
      .from("signups")
      .select("session_id")
      .eq("user_id", userId)
      .eq("status", "declined");

    if (declinedSignups && declinedSignups.length > 0) {
      const declinedIds = new Set(declinedSignups.map((s) => s.session_id));
      filtered = filtered.filter((s) => !declinedIds.has(s.id));
    }
  }

  // ── Generate iCal ────────────────────────────────────────────
  const calendarName =
    tabFilters.length === 1
      ? `NTCBC ${config.name} - ${visibleTabs.find((t) => t.value === tabFilters[0])?.label ?? tabFilters[0]}`
      : `NTCBC ${config.name} Sessions`;

  const proto = request.headers.get("x-forwarded-proto") ?? "https";
  const host = request.headers.get("host") ?? request.nextUrl.host;
  const origin = `${proto}://${host}`;

  const ical = sessionsToIcal(filtered, {
    calendarName,
    includeCancelled: true,
    buildSessionUrl: (session) => getSessionUrl(origin, sport, session.id),
  });

  // Fire-and-forget: track subscription access (not downloads — those are tracked client-side)
  if (!isDownload) {
    void supabase
      .from("calendar_tracking")
      .upsert(
        { user_id: userId, sport, mode: "subscribe" as const, last_used_at: new Date().toISOString() },
        { onConflict: "user_id,sport,mode", ignoreDuplicates: false },
      );
  }

  return new Response(ical, {
    status: 200,
    headers: buildHeaders(sport, isDownload),
  });
}

function buildHeaders(sport: string, isDownload: boolean): HeadersInit {
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
