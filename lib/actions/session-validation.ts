import { z } from "zod";

// ── Helpers ─────────────────────────────────────────────────────

/** Coerce empty / whitespace-only strings to `null` so Supabase clears the column on update. */
const optionalString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v?.trim() || null);

// ── Schema ──────────────────────────────────────────────────────

export const createSessionInputSchema = z
  .object({
    session_type: z.string().trim().min(1, { error: "Session type is required." }),
    title: optionalString,
    date: z.string().min(1, { error: "Date is required." }),
    time_start: z.string().min(1, { error: "Start time is required." }),
    time_end: z.string().min(1, { error: "End time is required." }),
    location_name: z.string().min(1, { error: "Location name is required." }),
    location_address: z.string().min(1, { error: "Location address is required." }),
    location_maps_link: optionalString,
    player_cap: z.number().int().positive().nullable().optional(),
    signup_open: z.string().min(1, { error: "Sign-up open time is required." }),
    signup_close: z.string().min(1, { error: "Sign-up close time is required." }),
    notes: optionalString,
    facilitator_id: z.string().uuid().nullable().optional().default(null),
  })
  .superRefine((value, ctx) => {
    if (value.time_start >= value.time_end) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["time_end"],
        message: "Session start time must be before end time",
      });
    }

    const signupOpen = new Date(value.signup_open);
    const signupClose = new Date(value.signup_close);

    if (signupOpen >= signupClose) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["signup_close"],
        message: "Sign-up open time must be before sign-up close time",
      });
    }

    const sessionStart = new Date(`${value.date}T${value.time_start}`);
    if (signupOpen > sessionStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["signup_open"],
        message: "Sign-up open time cannot be after session start time",
      });
    }

    const endOfSessionDay = new Date(`${value.date}T23:59`);
    if (signupClose > endOfSessionDay) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["signup_close"],
        message: "Sign-up close time must be on the session date (by 11:59 PM)",
      });
    }
  });

export type CreateSessionInput = z.infer<typeof createSessionInputSchema>;

/**
 * Validate and transform session input.
 * Returns the parsed data on success, or an error string on failure.
 * Works on both client and server.
 */
export function parseSessionInput(
  input: unknown,
): { success: true; data: CreateSessionInput } | { success: false; error: string } {
  const result = createSessionInputSchema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues[0]?.message ?? "Invalid session input" };
}
