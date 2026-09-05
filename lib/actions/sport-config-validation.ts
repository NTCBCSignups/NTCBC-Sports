import { z } from "zod";
import { AccessLevel, PillColor, Role } from "@/config/config-resolver";
import { ADMIN_TAB_ICON_NAMES } from "@/config/admin-tab-metadata";

// ── Reusable sub-schemas ────────────────────────────────────────

const roleSchema = z.nativeEnum(Role);

const signupDialogSchema = z.object({
  maxRole: roleSchema,
  message: z.string().min(1),
  rejectedMessage: z.string().min(1),
});

const tabSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1),
  label: z.string().min(1),
  defaultTitlePrefix: z.string().optional(),
  sessionPillColor: z.nativeEnum(PillColor),
  permissions: z
    .object({
      [AccessLevel.overview]: roleSchema,
      [AccessLevel.view]: roleSchema,
      [AccessLevel.signup]: roleSchema,
      [AccessLevel.admin]: roleSchema,
    })
    .refine((p) => p[AccessLevel.signup] !== Role.anon, {
      message: "Anonymous signup is not allowed",
      path: [AccessLevel.signup],
    }),
  signupConfirmationDialog: signupDialogSchema.optional(),
});

const adminTabSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  iconName: z.enum(ADMIN_TAB_ICON_NAMES),
});

// ── Full payload schema ─────────────────────────────────────────

export const updateSportConfigInputSchema = z
  .object({
    id: z.string().min(1),
    emoji: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
    day: z.string().min(1),
    organizers: z.string().min(1),
    waiverLink: z.string().url().optional(),
    location: z.object({
      name: z.string().min(1),
      address: z.string().min(1),
      mapsLink: z.string().url().optional(),
    }),
    notes: z.array(z.string().min(1)),
    defaultTab: z.string().optional(),
    defaultAdminTab: z.string().optional(),
    tabs: z.array(tabSchema),
    adminTabs: z.array(adminTabSchema),
  })
  .superRefine((value, context) => {
    const normalizedTabValues = value.tabs.map((tab) => tab.value.trim().toLowerCase());
    if (new Set(normalizedTabValues).size !== normalizedTabValues.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tabs"],
        message: "Session tab values must be unique",
      });
    }

    const normalizedTabIds = value.tabs.map((tab) => tab.id.trim());
    if (new Set(normalizedTabIds).size !== normalizedTabIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["tabs"],
        message: "Session tab ids must be unique",
      });
    }

    if (
      value.defaultTab &&
      !value.tabs.some((tab) => tab.value.trim() === value.defaultTab?.trim())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultTab"],
        message: "Default tab must match one of the session tab values",
      });
    }

    const defaultAdminTab = value.defaultAdminTab?.trim();
    if (defaultAdminTab) {
      const validAdminTabIds = new Set<string>([
        "settings",
        ...value.adminTabs.map((tab) => tab.id.trim()),
      ]);
      if (!validAdminTabIds.has(defaultAdminTab)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["defaultAdminTab"],
          message: "Default admin tab must match an available admin tab",
        });
      }
    }

    const adminTabIds = value.adminTabs.map((tab) => tab.id.trim());
    if (new Set(adminTabIds).size !== adminTabIds.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["adminTabs"],
        message: "Admin tabs cannot include duplicate tab ids",
      });
    }
  });

export type UpdateSportConfigInput = z.infer<typeof updateSportConfigInputSchema>;

// ── Per-field schemas for inline client validation ──────────────
// Extracted from the full schema shape so client-side validation
// uses the exact same rules as the server — single source of truth.

// The base z.object() shape is accessible via .shape even after .superRefine().
// We define field schemas directly from the same Zod primitives to keep types clean.
const requiredString = z.string().min(1);

/** Field schemas for inline validation on blur. */
export const sportConfigFieldSchemas = {
  name: requiredString,
  emoji: requiredString,
  type: requiredString,
  day: requiredString,
  organizers: requiredString,
  waiverLink: z.string().url().optional(),
  locationName: requiredString,
  locationAddress: requiredString,
  locationMapsLink: z.string().url().optional(),
} as const;

export type SportConfigFieldName = keyof typeof sportConfigFieldSchemas;

/** Human-readable labels for field error messages. */
const FIELD_LABELS: Record<SportConfigFieldName, string> = {
  name: "Sport name",
  emoji: "Emoji",
  type: "Sport type",
  day: "Schedule",
  organizers: "Organisers",
  waiverLink: "Waiver link",
  locationName: "Venue name",
  locationAddress: "Address",
  locationMapsLink: "Maps link",
};

/**
 * Validate a single field using its Zod schema.
 * Returns the first error message, or undefined if valid.
 *
 * Works on both client and server (no "use server" directive).
 */
export function validateConfigField(
  field: SportConfigFieldName,
  value: string,
): string | undefined {
  const schema = sportConfigFieldSchemas[field];
  // Treat empty optional fields as valid (Zod .optional() allows undefined, not "")
  const input = value.trim() || undefined;
  const result = schema.safeParse(input);
  if (result.success) return undefined;

  const zodMessage = result.error.issues[0]?.message;
  // Replace generic Zod messages with field-specific ones
  if (zodMessage === "Required" || zodMessage?.includes("too_small")) {
    return `${FIELD_LABELS[field]} is required.`;
  }
  if (zodMessage?.includes("url") || zodMessage?.includes("Invalid url")) {
    return `${FIELD_LABELS[field]} must be a valid URL.`;
  }
  return zodMessage ?? `${FIELD_LABELS[field]} is invalid.`;
}

/**
 * Validate all required fields. Returns a map of field → error message.
 * Used on save to show all errors at once.
 */
export function validateAllConfigFields(
  values: Record<SportConfigFieldName, string>,
): Partial<Record<SportConfigFieldName, string>> {
  const errors: Partial<Record<SportConfigFieldName, string>> = {};
  for (const [field, value] of Object.entries(values) as [SportConfigFieldName, string][]) {
    const error = validateConfigField(field, value);
    if (error) errors[field] = error;
  }
  return errors;
}
