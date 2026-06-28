import { SESSION_STATUS, type SportSession } from "@/lib/supabase/types";

export const BASE_CALENDAR_SESSION: SportSession = {
  id: "session-1",
  sport: "softball",
  session_type: "umpiring",
  title: "Umpire Crew",
  date: "2026-06-20",
  time_start: "18:30",
  time_end: "20:30",
  location_name: "Main Diamond",
  location_address: "123 Field Rd",
  location_maps_link: null,
  player_cap: 2,
  signup_open: "2026-06-10T12:00:00Z",
  signup_close: "2026-06-20T16:00:00Z",
  notes: null,
  status: SESSION_STATUS.active,
  status_notes: null,
  alt_session_views: [],
  facilitator_id: null,
  created_by: null,
  created_at: "2026-06-01T12:00:00Z",
};
