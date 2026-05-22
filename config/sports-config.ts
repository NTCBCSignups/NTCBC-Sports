/**
 * Raw sport config data and defaults. Internal to config/ — do not import
 * directly. Use config-resolver.ts as the single consumer entry point.
 */

import { AccessLevel, Role, PillColor, type SportConfig, type TabDefaults, type AdminTabMeta } from "./config-interfaces";

// ── Defaults ─────────────────────────────────────────────────────

export const DEFAULT_ADMIN_TABS: AdminTabMeta[] = [
  { id: "requests", label: "Access Requests", iconName: "ClipboardList" },
  { id: "create", label: "Create Session", iconName: "Plus" },
  { id: "upcoming", label: "Upcoming Sessions", iconName: "Calendar" },
  { id: "past", label: "Past Sessions", iconName: "History" },
];

export const SPORT_DEFAULTS = {
  authEnabled: false,
  adminTabs: DEFAULT_ADMIN_TABS,
  tab: {
    permissions: {
      [AccessLevel.view]: Role.anon,
      [AccessLevel.signup]: Role.user,
      [AccessLevel.admin]: Role.admin,
    },
    sessionPillColor: PillColor.gray,
  } satisfies TabDefaults,
} as const;

// ── Sport configurations ─────────────────────────────────────────

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
      "Please contact the leaders if you have any questions.",
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
          time: "7:30 PM – 10:00 PM",
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
      "Please contact the leaders if you have any questions.",
    ],
    responseTable: {
      sheetTab: "Form Responses 1",
      columns: [
        { index: 0, header: "Timestamp" },
        { index: 2, header: "Name" },
        { index: 3, header: "6:00 PM – 8:15 PM" },
        { index: 4, header: "8:15 PM – 10:30 PM" },
      ],
      sessions: [
        {
          time: "6:00 PM – 8:15 PM",
          playerCap: 21,
          description: "All levels",
          filterColumn: { header: "6:00 PM – 8:15 PM", value: "Yes" },
          hiddenColumns: ["8:15 PM – 10:30 PM"],
        },
        {
          time: "8:15 PM – 10:30 PM",
          playerCap: 18,
          description: "Intermediate+",
          filterColumn: { header: "8:15 PM – 10:30 PM", value: "Yes" },
          hiddenColumns: ["6:00 PM – 8:15 PM"],
        },
      ],
    },
  },
  softball: {
    id: "softball",
    authEnabled: true,
    adminTabs: [
      ...DEFAULT_ADMIN_TABS,
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
    description: "Join us for Drop-in Practices. Scheduled Games are only open to confirmed CCSA Team Members.",
    defaultTab: "drop_in_practice",
    tabs: [
      {
        value: "drop_in_practice",
        label: "Drop-in Practice",
        defaultTitlePrefix: "Practice",
        sessionPillColor: PillColor.emerald,
        permissions: { [AccessLevel.view]: Role.user },
      },
      {
        value: "scheduled_game",
        label: "Scheduled Games",
        defaultTitlePrefix: "Game",
        sessionPillColor: PillColor.indigo,
        permissions: { [AccessLevel.view]: Role.teamUser, [AccessLevel.signup]: Role.teamUser },
        alternateViews: [{ id: "customOrderedView", label: "Batting Order" }],
      },
      {
        value: "umpiring",
        label: "Umpiring",
        defaultTitlePrefix: "Umpiring",
        sessionPillColor: PillColor.amber,
        permissions: { [AccessLevel.view]: Role.teamUser, [AccessLevel.signup]: Role.teamUser },
      },
    ],
  },
} satisfies Record<string, SportConfig>;
