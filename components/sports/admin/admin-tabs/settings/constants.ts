import { AccessLevel, PillColor, Role } from "@/config/config-resolver";

export const AUTO_DEFAULT_TAB_VALUE = "__auto-default-tab__";

export const AUTO_DEFAULT_ADMIN_TAB_VALUE = "__auto-default-admin-tab__";

export const ROLE_OPTIONS: Array<{ value: Role; label: string; description: string }> = [
  { value: Role.anon, label: "Anyone", description: "No sign-in required" },
  { value: Role.user, label: "Signed-in users", description: "Any authenticated user" },
  { value: Role.teamUser, label: "Team members", description: "Only users on the team roster" },
  { value: Role.admin, label: "Admins", description: "Sport admins only" },
];

export const ACCESS_LEVEL_OPTIONS: Array<{
  value: AccessLevel;
  label: string;
  description: string;
}> = [
  {
    value: AccessLevel.overview,
    label: "Overview",
    description: "Who can see this tab in summary areas.",
  },
  {
    value: AccessLevel.view,
    label: "View",
    description: "Who can open and view the tab.",
  },
  {
    value: AccessLevel.signup,
    label: "Signup",
    description: "Who can sign up for sessions of this type.",
  },
  {
    value: AccessLevel.admin,
    label: "Admin",
    description: "Who can run admin actions for this type.",
  },
];

export const PILL_COLOR_OPTIONS: PillColor[] = Object.values(PillColor);
