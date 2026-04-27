import { Sport, FormResponseColumn } from "@/lib/schedule-utils";

export interface ResponseTableEntry {
  time: string;
  playerCap: number;
  description?: string;
  filterColumn?: { header: string; value: string };
  hiddenColumns?: string[];
}

export interface ResponseTableConfig {
  sheetTab: string;
  columns: FormResponseColumn[];
  sessions: ResponseTableEntry[];
}

export interface SessionTab {
  value: string;
  label: string;
  restrictedAccess?: boolean;
}

export interface AdminTabMeta {
  id: string;
  label: string;
  /** Lucide icon name (must be mapped in admin-sidebar) */
  iconName: string;
}

export interface SportConfig {
  id: Sport;
  emoji: string;
  name: string;
  type: string;
  location: {
    name: string;
    address: string;
    mapsLink?: string;
  };
  day: string;
  organizers: string;
  waiverLink?: string;
  notes: string[];
  responseTable?: ResponseTableConfig;
  multiSession?: boolean;
  description?: string;
  tabs?: SessionTab[];
  defaultTab?: string;
  authEnabled?: boolean;
  /** Extra sport-specific tabs to show in the admin sidebar. */
  adminTabs?: AdminTabMeta[];
}

/** Returns true if the given session type belongs to a restricted-access tab. */
export function isRestrictedSessionType(config: SportConfig | undefined, sessionType: string): boolean {
  return config?.tabs?.some((t) => t.value === sessionType && t.restrictedAccess) ?? false;
}

/** Returns true if the sport has any tab with restricted access. */
export function hasRestrictedAccess(config: SportConfig | undefined): boolean {
  return config?.tabs?.some((t) => t.restrictedAccess) ?? false;
}

export const sportsConfig: Record<string, SportConfig> = {
  basketball: {
    id: "basketball",
    authEnabled: false,
    emoji: "🏀",
    name: "Basketball",
    type: "Drop-in Sessions",
    location: {
      name: "North Toronto Chinese Baptist Church",
      address: "88 Finch Ave W, North York",
      mapsLink: "https://maps.app.goo.gl/RRBF3EAJWLkAU64W6",
    },
    day: "Monday nights",
    organizers: "Phoebe Chow, Daniel Ye, Brandon Cho",
    waiverLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform",
    notes: [
      "This basketball session is part of our church ministry. It's a great time for us to connect not only through the game but also with each other and the message of the gospel. Everyone, regardless of your faith background, is welcome to join.",
      "By filling out the form, you are signing up to attend this session. If you can no longer attend, please modify your response in the form.",
      "Please contact the admins if you have any questions.",
      "NTCBC is not liable for any lost possessions or injuries during the session.",
    ],
    responseTable: {
      sheetTab: "Form Responses 1",
      columns: [
        { index: 0, header: "Timestamp" },
        { index: 2, header: "Name" },
        { index: 5, header: "Attending" },
      ],
      sessions: [
        {
          time: "7:30 PM - 10:00 PM",
          playerCap: 20,
          description: "All levels",
          filterColumn: { header: "Attending", value: "Yes" },
        },
      ],
    },
  },
  volleyball: {
    id: "volleyball",
    authEnabled: false,
    emoji: "🏐",
    name: "Volleyball",
    type: "Drop-in Sessions",
    location: {
      name: "North Toronto Chinese Baptist Church",
      address: "88 Finch Ave W, North York",
      mapsLink: "https://maps.app.goo.gl/RRBF3EAJWLkAU64W6",
    },
    day: "Wednesday nights",
    organizers: "Jonathan Wong, Jonathan Leung",
    waiverLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform",
    notes: [
      "This volleyball session is part of our church ministry. It's a great time for us to connect not only through the game but also with each other and the message of the gospel. Everyone, regardless of your faith background, is welcome to join.",
      "We have two sessions. You may sign up to one or both.",
      "Don't play volleyball in the basement foyer as you may break the lights.",
      "Don't cross the centre line, as this can cause serious injuries.",
      "By filling out the form, you are signing up to attend this session. If you can no longer attend, please modify your response in the form.",
      "Please contact the admins if you have any questions.",
    ],
    responseTable: {
      sheetTab: "Form Responses 1",
      columns: [
        { index: 0, header: "Timestamp" },
        { index: 2, header: "Name" },
        { index: 3, header: "6:00 PM - 8:15 PM" },
        { index: 4, header: "8:15 PM - 10:30 PM" },
      ],
      sessions: [
        {
          time: "6:00 PM - 8:15 PM",
          playerCap: 21,
          description: "All levels",
          filterColumn: { header: "6:00 PM - 8:15 PM", value: "Yes" },
          hiddenColumns: ["8:15 PM - 10:30 PM"],
        },
        {
          time: "8:15 PM - 10:30 PM",
          playerCap: 18,
          description: "Intermediate+",
          filterColumn: { header: "8:15 PM - 10:30 PM", value: "Yes" },
          hiddenColumns: ["6:00 PM - 8:15 PM"],
        },
      ],
    },
  },
  softball: {
    id: "softball",
    authEnabled: true,
    adminTabs: [
      { id: "ccsa", label: "CCSA Sync", iconName: "RefreshCw" },
    ],
    emoji: "🥎",
    name: "Softball",
    type: "Drop-in Practice & Scheduled CCSA Games",
    location: {
      name: "Various locations",
      address: "See individual sessions",
    },
    day: "Click to see schedule",
    organizers: "Brandon Cho, Joshua Wong, Isaac Ng",
    notes: [
      "Our team plays in the CCSA (Christian Community Softball Association), a Toronto-area church softball league that runs during the summer with Senior and Junior divisions.",
      "Team registration for the 2026 season is now closed, but you're welcome to join our drop-in practice sessions! It's a great time for us to connect not only through the game but also with each other and the message of the gospel. Everyone, regardless of your faith background, is welcome.",
      "Softball has two session types: Drop-in Practice (open to all) & Scheduled Games (team members only).",
      "Sign in with Google to sign up for sessions. If you can no longer attend, please cancel your signup.",
      "Please contact the leaders if you have any questions.",
    ],
    description: "Join us for drop-in practice sessions. Sign in to view and sign up for upcoming sessions.",
    defaultTab: "drop_in_practice",
    tabs: [
      { value: "scheduled_game", label: "Scheduled Games", restrictedAccess: true },
      { value: "drop_in_practice", label: "Drop-in Practice" },
    ],
  },
} satisfies Record<string, SportConfig>;
