import {
  AccessLevel,
  Role,
  PillColor,
  type SportConfig,
  type SportConfigDbRow,
  type SessionTab,
} from "@/config/config-resolver";

export const TAB_A: SessionTab = {
  id: "tab-a",
  value: "regular",
  label: "Regular",
  sessionPillColor: PillColor.emerald,
  permissions: {
    [AccessLevel.overview]: Role.anon,
    [AccessLevel.view]: Role.anon,
    [AccessLevel.signup]: Role.user,
    [AccessLevel.admin]: Role.admin,
  },
};

export const TAB_B: SessionTab = {
  id: "tab-b",
  value: "competitive",
  label: "Competitive",
  sessionPillColor: PillColor.indigo,
  permissions: {
    [AccessLevel.overview]: Role.anon,
    [AccessLevel.view]: Role.anon,
    [AccessLevel.signup]: Role.teamUser,
    [AccessLevel.admin]: Role.admin,
  },
};

export const BASE_CONFIG: SportConfig = {
  id: "volleyball",
  emoji: "🏐",
  name: "Volleyball",
  type: "volleyball",
  day: "Saturdays",
  organizers: "John",
  location: { name: "Gym", address: "123 St" },
  notes: ["Bring shoes"],
  tabs: [TAB_A, TAB_B],
};

export const VALID_DB_ROW: SportConfigDbRow = {
  id: "volleyball",
  auth_enabled: true,
  emoji: "🏐",
  name: "Volleyball",
  type: "volleyball",
  description: null,
  config: {
    day: "Saturdays",
    organizers: "John",
    location: { name: "Gym", address: "123 St" },
    notes: ["Bring shoes"],
    tabs: [TAB_A],
  },
  updated_by: null,
  updated_at: "2024-01-01",
  created_at: "2024-01-01",
};
