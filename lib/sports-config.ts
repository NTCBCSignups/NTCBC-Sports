import { Sport, FormResponseColumn } from "./schedule-utils";

export interface SportSession {
  time: string;
}

export interface ResponseTableEntry {
  label: string;
  playerCap: number;
  filterColumn?: { header: string; value: string };
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
  };
  day: string;
  sessions: SportSession[];
  organizers: string;
  waiverLink: string;
  additionalNotes: string[];
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
    },
    day: "Wednesday Nights",
    sessions: [
      { time: "6:00 PM - 8:15 PM (Casual)" },
      { time: "8:15 PM - 10:30 PM (Intermediate+, must know 5-1)" },
    ],
    organizers: "Jonathan Wong, Jonathan Leung, Christa Ng",
    waiverLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform",
    additionalNotes: [
      "We have two sessions. You may sign up to one or both.",
      "Don't play volleyball in the basement foyer as you may break the lights.",
      "Don't cross the centre line, as this can cause serious injuries.",
      "By filling out the form, you are signing up to attend this session. If you can no longer attend please notify the group chat or DM the organizers."
    ],
    // responseTable: {
    //   sheetTab: "Form Responses 1",
    //   columns: [
    //     { index: 0, header: "Timestamp" },
    //     { index: 2, header: "Name" },
    //     { index: 7, header: "Attending" },
    //   ],
    //   tables: [
    //     {
    //       label: "6:00 PM - 8:15 PM (Casual)",
    //       playerCap: 21,
    //       filterColumn: { header: "Attending", value: "Yes" },
    //     },
    //     {
    //       label: "8:15 PM - 10:30 PM (Intermediate+, must know 5-1)",
    //       playerCap: 18,
    //       filterColumn: { header: "Attending", value: "Yes" },
    //     },
    //   ],
    // },
  },
  basketball: {
    id: "basketball",
    emoji: "🏀",
    name: "Basketball",
    location: {
      name: "North Toronto Chinese Baptist Church",
      address: "88 Finch Ave W, North York",
    },
    day: "Monday Nights",
    sessions: [{ time: "7:30 PM - 10:00 PM" }],
    organizers: "Phoebe Chow, Daniel Ye, Brandon Cho",
    waiverLink:
      "https://docs.google.com/forms/d/e/1FAIpQLSdNYPEtVxNSR2XQ_tAT0UpCRr2FnuG9MAEGPkUFk1noRxSx_w/viewform",
    additionalNotes: [
      "By filling out the form, you are signing up to attend this session. If you can no longer attend, please modify your response in the form.",
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
          label: "Sign-ups",
          playerCap: 20,
          filterColumn: { header: "Attending", value: "Yes" },
        },
      ],
    },
  },
};
