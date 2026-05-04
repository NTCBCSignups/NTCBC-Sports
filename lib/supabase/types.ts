export type UserRole = "user" | "admin";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export type SportRoleType = "member" | "admin";

export interface SportRole {
  id: string;
  user_id: string;
  sport: string;
  role: SportRoleType;
  is_team_member: boolean;
  created_at: string;
}

export type SessionType = "scheduled_game" | "drop_in_practice";

export interface SportSession {
  id: string;
  sport: string;
  session_type: SessionType;
  title: string | null;
  date: string;
  time_start: string;
  time_end: string;
  location_name: string;
  location_address: string;
  location_maps_link: string | null;
  player_cap: number | null;
  signup_open: string;
  signup_close: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export type SignupStatus = "confirmed" | "waitlisted" | "cancelled" | "declined";

export interface Signup {
  id: string;
  session_id: string;
  user_id: string;
  status: SignupStatus;
  created_at: string;
  profiles?: Profile;
}

export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface TeamAccessRequest {
  id: string;
  user_id: string;
  sport: string;
  status: AccessRequestStatus;
  reviewed_by: string | null;
  created_at: string;
  reviewed_at: string | null;
  profiles?: Profile;
}

export type WaiverStatus = "valid" | "needs_paper" | "needs_online";

export interface CcsaPlayer {
  id: string;
  email: string;
  ccsa_player_id: number;
  first_name: string;
  last_name: string;
  waiver_status: WaiverStatus;
  synced_at: string;
}
