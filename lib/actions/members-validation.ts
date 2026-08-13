import { z } from "zod";

// ── Schemas ─────────────────────────────────────────────────────

export const sportSchema = z.string().trim().min(1);
export const userIdSchema = z.string().uuid();
export const userIdsSchema = z.array(userIdSchema).min(1, { error: "No users selected" });
export const roleSchema = z.enum(["member", "admin"]).optional();
export const roleUpdatesSchema = z.object({
  role: roleSchema,
  isTeamMember: z.boolean().optional(),
});

export type RoleUpdates = z.infer<typeof roleUpdatesSchema>;

// ── Composite schemas (one per action) ──────────────────────────

export const updateMemberRoleInputSchema = z.object({
  sport: sportSchema,
  userId: userIdSchema,
  updates: roleUpdatesSchema,
});

export const addMemberInputSchema = z.object({
  sport: sportSchema,
  userId: userIdSchema,
  options: roleUpdatesSchema,
});

export const removeMemberInputSchema = z.object({
  sport: sportSchema,
  userId: userIdSchema,
});

export const bulkUpdateMembersInputSchema = z.object({
  sport: sportSchema,
  userIds: userIdsSchema,
  updates: roleUpdatesSchema,
});

export const bulkRemoveMembersInputSchema = z.object({
  sport: sportSchema,
  userIds: userIdsSchema,
});

export const searchUsersInputSchema = z.object({
  sport: sportSchema,
  query: z.string(),
});

// ── Parse helper (shared by client + server) ────────────────────

export function parseMemberInput<T extends z.ZodType>(
  schema: T,
  input: unknown,
): { success: true; data: z.infer<T> } | { success: false; error: string } {
  const result = schema.safeParse(input);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.issues[0]?.message ?? "Invalid input" };
}
