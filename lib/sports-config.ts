import { Sport, FormResponseColumn } from "./schedule-utils";

export interface SportSession {
  time: string;
}

export interface ResponseTableEntry {
  label: string;
  playerCap: number;
  description?: string;
  filterColumn?: { header: string; value: string };
  hiddenColumns?: string[];
}

export interface ResponseTableConfig {
  sheetTab: string;
  columns: FormResponseColumn[];
  tables: ResponseTableEntry[];
}

export interface SportConfig {
  id: Sport;
  emoji: string;
  name: string;
  location: {
    name: string;
    address: string;
    mapsLink?: string;
  };
  day: string;
  sessions: SportSession[];
  organizers: string;
  waiverLink?: string;
  notes: string[];
  responseTable?: ResponseTableConfig;
}

export const sportsConfig: Record<string, SportConfig> = {
  volleyball: {
    id: "volleyball",
    emoji: "🏐",
    name: "Volleyball",
    location: {
      name: "North Toronto Chinese Baptist Church",
      address: "88 Finch Ave W, North York",
      mapsLink: "https://maps.app.goo.gl/RRBF3EAJWLkAU64W6",
    },
    day: "Wednesday nights",
    sessions: [
      { time: "6:00 PM - 8:15 PM (All levels)" },
      { time: "8:15 PM - 10:30 PM (Intermediate+)" },
    ],
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
      tables: [
        {
          label: "6:00 PM - 8:15 PM",
          playerCap: 21,
          description: "All levels",
          filterColumn: { header: "6:00 PM - 8:15 PM", value: "Yes" },
          hiddenColumns: ["8:15 PM - 10:30 PM"],
        },
        {
          label: "8:15 PM - 10:30 PM",
          playerCap: 18,
          description: "Intermediate+",
          filterColumn: { header: "8:15 PM - 10:30 PM", value: "Yes" },
          hiddenColumns: ["6:00 PM - 8:15 PM"],
        },
      ],
    },
  },
  basketball: {
    id: "basketball",
    emoji: "🏀",
    name: "Basketball",
    location: {
      name: "North Toronto Chinese Baptist Church",
      address: "88 Finch Ave W, North York",
      mapsLink: "https://maps.app.goo.gl/RRBF3EAJWLkAU64W6",
    },
    day: "Monday nights",
    sessions: [{ time: "7:30 PM - 10:00 PM" }],
    organizers: "Phoebe Chow, Daniel Ye, Brandon Cho",
    waiverLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform",
    notes: [
      "This basketball session is part of our church ministry. It's a great time for us to connect not only through the game but also with each other and the message of the gospel. Everyone, regardless of your faith background, is welcome to join.",
      "By filling out the form, you are signing up to attend this session. If you can no longer attend, please modify your response in the form.",
      "Please contact the admins if you have any questions.",
    ],
    responseTable: {
      sheetTab: "Form Responses 1",
      columns: [
        { index: 0, header: "Timestamp" },
        { index: 2, header: "Name" },
        { index: 5, header: "Attending" },
      ],
      tables: [
        {
          label: "7:30 PM - 10:00 PM",
          playerCap: 20,
          description: "All levels",
          filterColumn: { header: "Attending", value: "Yes" },
        },
      ],
    },
  },
};
