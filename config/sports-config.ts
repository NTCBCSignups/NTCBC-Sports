/**
 * Legacy file-backed sport config used by the legacy basketball Google Sheets flow.
 *
 * [sport]-routed runtime/admin pages use DB-backed config via get-sport-config.
 */

import type { SportConfig } from "./config-interfaces";

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
} satisfies Record<string, SportConfig>;
