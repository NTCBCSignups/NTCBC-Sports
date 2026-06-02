import "server-only";
import { unstable_cache } from "next/cache";
import {
    resolvedSportsConfig,
    resolveSportConfigRow,
    type ResolvedSportConfig,
    type SourcedSportConfig,
} from "@/config/config-resolver";
import { getSportConfigRow, getSportConfigRows } from "@/lib/get-data";

export const SPORT_CONFIGS_CACHE_TAG = "sport-configs";

export function sportConfigCacheTag(sport: string): string {
    return `sport-config:${sport}`;
}

function getCachedSportConfigRow(sport: string) {
    return unstable_cache(
        async () => getSportConfigRow(sport),
        ["sport-config", sport],
        { tags: [SPORT_CONFIGS_CACHE_TAG, sportConfigCacheTag(sport)] },
    )();
}

const getCachedSportConfigRows = unstable_cache(
    async () => getSportConfigRows(),
    ["sport-configs:all"],
    { tags: [SPORT_CONFIGS_CACHE_TAG] },
);

/**
 * Returns resolved config with DB-first lookup and file fallback.
 * Consumers can migrate to this helper incrementally.
 */
export async function getResolvedSportConfig(sport: string): Promise<ResolvedSportConfig | null> {
    const row = await getCachedSportConfigRow(sport);
    const dbResolved = row ? resolveSportConfigRow(row) : null;
    if (dbResolved) return dbResolved;
    return resolvedSportsConfig[sport] ?? null;
}

/** Returns resolved config plus source metadata for debugging and rollout checks. */
export async function getResolvedSportConfigWithSource(sport: string): Promise<SourcedSportConfig | null> {
    const row = await getCachedSportConfigRow(sport);
    const dbResolved = row ? resolveSportConfigRow(row) : null;
    if (dbResolved) {
        return { source: "database", config: dbResolved };
    }

    const fileResolved = resolvedSportsConfig[sport];
    return fileResolved
        ? { source: "file", config: fileResolved }
        : null;
}

/**
 * Returns all resolved sport configs with DB rows overriding file-backed defaults.
 * This supports pages (like home) that list all sports in one query.
 */
export async function getResolvedSportsConfigBySport(): Promise<Record<string, ResolvedSportConfig>> {
    const merged: Record<string, ResolvedSportConfig> = { ...resolvedSportsConfig };
    const dbRows = await getCachedSportConfigRows();

    for (const row of dbRows) {
        const resolved = resolveSportConfigRow(row);
        if (resolved) {
            merged[row.id] = resolved;
        }
    }

    return merged;
}
