"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import { type SessionTab, type SportConfigPayload } from "@/config/config-resolver";
import { validateImmutableSessionTabValues } from "@/config/session-tab-rules";
import {
  updateSportConfigInputSchema,
  type UpdateSportConfigInput,
} from "@/lib/actions/sport-config-validation";

export type { UpdateSportConfigInput };

export type UpdateSportConfigResult = { success: true } | { success: false; error: string };

export async function updateSportConfig(
  sport: string,
  input: UpdateSportConfigInput,
): Promise<UpdateSportConfigResult> {
  const parsed = updateSportConfigInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "Invalid config payload",
    };
  }

  if (parsed.data.id !== sport) {
    return {
      success: false,
      error: "Sport ID mismatch",
    };
  }

  const supabase = await createClient();
  const authResult = await requireSportAdmin(supabase, sport);
  if (!authResult.success) {
    return {
      success: false,
      error: authResult.error,
    };
  }

  const { data: existing, error: existingError } = await supabase
    .from("sport_configs")
    .select("config")
    .eq("id", sport)
    .single();

  if (existingError || !existing) {
    return {
      success: false,
      error: existingError?.message ?? "Sport config not found",
    };
  }

  const existingConfig: SportConfigPayload =
    existing.config && typeof existing.config === "object" && !Array.isArray(existing.config)
      ? (existing.config as SportConfigPayload)
      : {};

  const existingTabs: SessionTab[] = Array.isArray(existingConfig.tabs)
    ? existingConfig.tabs.filter(
        (tab): tab is SessionTab =>
          !!tab &&
          typeof tab === "object" &&
          typeof tab.value === "string" &&
          (tab.id === undefined || typeof tab.id === "string"),
      )
    : [];
  const immutableValueResult = validateImmutableSessionTabValues(existingTabs, parsed.data.tabs);
  if (!immutableValueResult.success) {
    return {
      success: false,
      error: immutableValueResult.error,
    };
  }

  // Preserve unknown keys by overlaying managed fields on top of existing JSON payload.
  const mergedConfig: SportConfigPayload = {
    ...existingConfig,
    day: parsed.data.day,
    organizers: parsed.data.organizers,
    location: {
      name: parsed.data.location.name,
      address: parsed.data.location.address,
      mapsLink: parsed.data.location.mapsLink || undefined,
    },
    notes: parsed.data.notes,
    defaultTab: parsed.data.defaultTab ?? "",
    defaultAdminTab: parsed.data.defaultAdminTab ?? "",
    tabs: parsed.data.tabs,
    adminTabs: parsed.data.adminTabs,
  };

  const { error } = await supabase
    .from("sport_configs")
    .update({
      emoji: parsed.data.emoji,
      name: parsed.data.name,
      type: parsed.data.type,
      description: parsed.data.description || null,
      config: mergedConfig,
      updated_by: authResult.user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sport);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  revalidatePath("/");
  revalidatePath(`/${sport}`);
  revalidatePath(`/${sport}/admin`);

  return { success: true };
}
