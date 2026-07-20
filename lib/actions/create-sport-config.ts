"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireGlobalAdmin } from "@/lib/supabase/user";
import { buildDefaultSportConfigPayload } from "@/config/admin-tab-metadata";

const createSportConfigSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "ID must be lowercase alphanumeric with hyphens only"),
  emoji: z.string().min(1),
  name: z.string().min(1),
  type: z.string().min(1),
  day: z.string().min(1),
  organizers: z.string().min(1),
  locationName: z.string().min(1),
  locationAddress: z.string().min(1),
});

export type CreateSportConfigInput = z.infer<typeof createSportConfigSchema>;

export type CreateSportConfigResult =
  | { success: true; id: string }
  | { success: false; error: string };

export async function createSportConfig(
  input: CreateSportConfigInput,
): Promise<CreateSportConfigResult> {
  const parsed = createSportConfigSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const supabase = await createClient();
  const auth = await requireGlobalAdmin(supabase);
  if (!auth.success) return { success: false, error: auth.error };
  const { user } = auth;

  const config = buildDefaultSportConfigPayload({
    day: parsed.data.day,
    organizers: parsed.data.organizers,
    locationName: parsed.data.locationName,
    locationAddress: parsed.data.locationAddress,
  });

  const { error } = await supabase.from("sport_configs").insert({
    id: parsed.data.id,
    auth_enabled: false,
    emoji: parsed.data.emoji,
    name: parsed.data.name,
    type: parsed.data.type,
    config,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (error.code === "23505") {
      return { success: false, error: "A sport with this ID already exists" };
    }
    return { success: false, error: error.message };
  }

  revalidatePath("/");

  return { success: true, id: parsed.data.id };
}
