import "server-only";
import {
    resolveSportConfigRow,
    type ResolvedSportConfig,
} from "@/config/config-resolver";
import { getSportConfigRow, getSportConfigRows } from "@/lib/get-data";

export const SPORT_CONFIGS_CACHE_TAG = "sport-configs";

export function sportConfigCacheTag(sport: string): string {
    return `sport-config:${sport}`;
}

/**
 * Returns resolved config from the database.
 */
export async function getResolvedSportConfig(sport: string): Promise<ResolvedSportConfig | null> {
    const row = await getSportConfigRow(sport);
    return row ? resolveSportConfigRow(row) : null;
}

/**
 * Returns all resolved sport configs from DB rows.
 */
export async function getResolvedSportsConfigBySport(): Promise<Record<string, ResolvedSportConfig>> {
    const merged: Record<string, ResolvedSportConfig> = {};
    const dbRows = await getSportConfigRows();

    for (const row of dbRows) {
        const resolved = resolveSportConfigRow(row);
        if (resolved) {
            merged[row.id] = resolved;
        }
    }

    return merged;
}
