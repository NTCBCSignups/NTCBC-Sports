export interface ChangelogEntry {
  /** Sequential integer — used as high water mark for read tracking. */
  id: number;
  /** ISO date string (YYYY-MM-DD) for display. */
  date: string;
  title: string;
  description: string;
  /** Optional route prefixes where the popover auto-opens for this entry. */
  routes?: string[];
}

/**
 * App changelog entries — newest first.
 * To announce a new feature, prepend an entry with the next sequential `id`.
 */
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: 28,
    date: "2026-08-03",
    title: "Easier Navigation",
    description:
      "New navigation path at the top of pages lets you jump back to previous sections with a single click!",
  },
  {
    id: 27,
    date: "2026-07-16",
    title: "Sakura Theme",
    description: "A beautiful new cherry blossom theme is available in the theme picker!",
  },
  {
    id: 26,
    date: "2026-07-13",
    title: "New Home Page",
    description:
      "The home page has been redesigned with quick access to sign-in and theme switching!",
  },
  {
    id: 25,
    date: "2026-07-10",
    title: "CCSA Game Sync",
    description: "Admins can now sync game schedules directly from CCSA — no more manual entry!",
    routes: ["/softball/admin"],
  },
  {
    id: 24,
    date: "2026-07-06",
    title: "Quick Devotional Access",
    description: "A shortcut button now lets you jump straight to the devotional from any session!",
  },
  {
    id: 23,
    date: "2026-07-06",
    title: "Statistics",
    description:
      "View your personal signup history and attendance stats — admins also get signup trends, engagement metrics, and calendar usage!",
  },
  {
    id: 22,
    date: "2026-07-01",
    title: "People Management",
    description:
      "Admins can now view and manage all members, roles, and team access from a dedicated People tab!",
  },
  {
    id: 21,
    date: "2026-07-01",
    title: "Basketball Gets Sign-In",
    description:
      "Basketball has been upgraded from Google Sheets to the full app experience with Google sign-in!",
    routes: ["/basketball"],
  },
  {
    id: 20,
    date: "2026-06-29",
    title: "Volleyball Gets Sign-In",
    description:
      "Volleyball has been upgraded from Google Sheets to the full app experience with Google sign-in!",
    routes: ["/volleyball"],
  },
  {
    id: 19,
    date: "2026-06-29",
    title: "Clickable Links in Notes",
    description: "URLs in session notes are now clickable — tap to open links directly!",
  },
  {
    id: 18,
    date: "2026-06-28",
    title: "Session Facilitators",
    description:
      "Sessions can now have a designated facilitator — admins can assign someone to help run things!",
  },
  {
    id: 17,
    date: "2026-06-23",
    title: "Devotionals",
    description:
      "Sessions can now include a devotional section for group reflection and discussion!",
  },
  {
    id: 16,
    date: "2026-06-05",
    title: "Calendar Export",
    description:
      "Subscribe to your sport's schedule with a personal iCal feed — syncs right to Google Calendar, Apple Calendar, and more!",
  },
  {
    id: 15,
    date: "2026-06-04",
    title: "Admin Settings Page",
    description:
      "Admins can now configure sport settings, tabs, and permissions right from the app — no code changes needed!",
  },
  {
    id: 14,
    date: "2026-06-01",
    title: "Softball Socials",
    description:
      "Social events are now a session type for softball — sign up for hangouts and team bonding!",
    routes: ["/softball"],
  },
  {
    id: 13,
    date: "2026-05-24",
    title: "Waitlist Management",
    description:
      "Admins can now promote and demote signups directly from the attendance view — managing the waitlist is a breeze!",
  },
  {
    id: 12,
    date: "2026-05-22",
    title: "Fielding View",
    description:
      "Softball admins can now set up fielding positions with a diamond layout and lineup tracking!",
    routes: ["/softball"],
  },
  {
    id: 11,
    date: "2026-05-22",
    title: "Session Views",
    description:
      "Admins can now set up custom session views like attendance tracking and ordered lineups!",
  },
  {
    id: 10,
    date: "2026-05-19",
    title: "Edit & Cancel Sessions",
    description: "Admins can now edit session details and cancel sessions directly from the app!",
  },
  {
    id: 9,
    date: "2026-05-19",
    title: "Dark Mode",
    description: "Toggle between light and dark themes from the contrast icon in the header!",
  },
  {
    id: 8,
    date: "2026-05-15",
    title: "Session Filter",
    description: "Filter sessions by type to quickly find practices, games, or umpiring!",
  },
  {
    id: 7,
    date: "2026-05-04",
    title: "Session Types",
    description:
      "Sessions now have types like practices, games, and umpiring — so you always know what's coming up!",
  },
  {
    id: 6,
    date: "2026-05-04",
    title: '"Unable to Join" Status',
    description:
      "You can now let organizers know you can't make it — a new response option besides signing up or cancelling!",
  },
  {
    id: 5,
    date: "2026-04-22",
    title: "Team Member Badges",
    description: "You can now see who's a registered team member right in the signup lists!",
  },
  {
    id: 4,
    date: "2026-04-21",
    title: "CCSA Player Sync",
    description: "Admins can now sync player data and waiver status directly from the CCSA system!",
    routes: ["/softball/admin"],
  },
  {
    id: 3,
    date: "2026-03-28",
    title: "Softball & Sign-In",
    description:
      "Softball is now on the app with Google sign-in for team management and roster tracking!",
    routes: ["/softball"],
  },
  {
    id: 2,
    date: "2026-02-20",
    title: "Basketball Added",
    description: "Basketball now has its own signup page — check the schedule and sign up!",
    routes: ["/basketball"],
  },
  {
    id: 1,
    date: "2025-06-28",
    title: "NTCBC Signups is Live",
    description:
      "The app is here! Sign up for volleyball sessions with a countdown timer and player cap — no more group chat chaos!",
    routes: ["/volleyball"],
  },
];
