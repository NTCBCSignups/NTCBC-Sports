"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireSportAdmin } from "@/lib/supabase/user";
import {
    AccessLevel,
    PillColor,
    Role,
    type SportConfigPayload,
} from "@/config/config-resolver";
import { ADMIN_TAB_ICON_NAMES } from "@/config/admin-tab-metadata";

const roleSchema = z.nativeEnum(Role);

const signupDialogSchema = z.object({
    maxRole: roleSchema,
    message: z.string().min(1),
    rejectedMessage: z.string().min(1),
});

const tabSchema = z.object({
    value: z.string().min(1),
    label: z.string().min(1),
    defaultTitlePrefix: z.string().optional(),
    sessionPillColor: z.nativeEnum(PillColor),
    permissions: z.object({
        [AccessLevel.overview]: roleSchema,
        [AccessLevel.view]: roleSchema,
        [AccessLevel.signup]: roleSchema,
        [AccessLevel.admin]: roleSchema,
    }),
    signupConfirmationDialog: signupDialogSchema.optional(),
});

const adminTabSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    iconName: z.enum(ADMIN_TAB_ICON_NAMES),
});

const updateSportConfigInputSchema = z.object({
    id: z.string().min(1),
    authEnabled: z.boolean(),
    emoji: z.string().min(1),
    name: z.string().min(1),
    type: z.string().min(1),
    description: z.string().optional(),
    day: z.string().min(1),
    organizers: z.string().min(1),
    location: z.object({
        name: z.string().min(1),
        address: z.string().min(1),
        mapsLink: z.string().optional(),
    }),
    notes: z.array(z.string().min(1)),
    defaultTab: z.string().optional(),
    defaultAdminTab: z.string().optional(),
    tabs: z.array(tabSchema),
    adminTabs: z.array(adminTabSchema),
}).superRefine((value, context) => {
    const normalizedTabValues = value.tabs.map((tab) => tab.value.trim().toLowerCase());
    if (new Set(normalizedTabValues).size !== normalizedTabValues.length) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["tabs"],
            message: "Session tab values must be unique",
        });
    }

    if (value.defaultTab && !value.tabs.some((tab) => tab.value.trim() === value.defaultTab?.trim())) {
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

export type UpdateSportConfigResult =
    | { success: true }
    | { success: false; error: string };

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
        existing.config
        && typeof existing.config === "object"
        && !Array.isArray(existing.config)
            ? (existing.config as SportConfigPayload)
            : {};

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
            auth_enabled: parsed.data.authEnabled,
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
