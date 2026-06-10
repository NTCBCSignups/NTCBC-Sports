// ── Position definitions ─────────────────────────────────────────

export const POSITIONS = {
    batting: [
        { key: "1B_COACH", label: "1B Coach", short: "1B Coach" },
        { key: "3B_COACH", label: "3B Coach", short: "3B Coach" },
    ],
    infield: [
        { key: "PITCHER", label: "Pitcher", short: "P" },
        { key: "CATCHER", label: "Catcher", short: "C" },
        { key: "FIRST_BASE", label: "1st Base", short: "1B" },
        { key: "SECOND_BASE", label: "2nd Base", short: "2B" },
        { key: "SHORTSTOP", label: "Shortstop", short: "SS" },
        { key: "THIRD_BASE", label: "3rd Base", short: "3B" },
    ],
    outfield: [
        { key: "LEFT_FIELD", label: "Left Field", short: "LF" },
        { key: "LEFT_ROVER", label: "Left Rover", short: "LR" },
        { key: "CENTRE_FIELD", label: "Centre Field", short: "CF" },
        { key: "RIGHT_ROVER", label: "Right Rover", short: "RR" },
        { key: "RIGHT_FIELD", label: "Right Field", short: "RF" },
    ],
} as const;

export const ALL_POSITIONS = [
    ...POSITIONS.batting,
    ...POSITIONS.infield,
    ...POSITIONS.outfield,
];

export const COACH_KEYS: Set<string> = new Set(POSITIONS.batting.map((p) => p.key));

export const POSITION_GROUPS = [
    { label: "Batting", positions: POSITIONS.batting },
    { label: "Infield", positions: POSITIONS.infield },
    { label: "Outfield", positions: POSITIONS.outfield },
] as const;

export const DIAMOND_POSITIONS: Record<string, { x: number; y: number }> = {
    CENTRE_FIELD: { x: 50, y: 5 },
    LEFT_FIELD: { x: 6, y: 18 },
    RIGHT_FIELD: { x: 94, y: 18 },
    LEFT_ROVER: { x: 24, y: 24 },
    RIGHT_ROVER: { x: 76, y: 24 },
    SHORTSTOP: { x: 36, y: 48 },
    SECOND_BASE: { x: 64, y: 48 },
    THIRD_BASE: { x: 22, y: 64 },
    FIRST_BASE: { x: 78, y: 64 },
    PITCHER: { x: 50, y: 68 },
    CATCHER: { x: 50, y: 94 },
    "1B_COACH": { x: 84, y: 82 },
    "3B_COACH": { x: 16, y: 82 },
};

export const INFIELD_KEYS: Set<string> = new Set(POSITIONS.infield.map((p) => p.key));
export const OUTFIELD_KEYS: Set<string> = new Set(POSITIONS.outfield.map((p) => p.key));

/** Offensive positions: batting coaches + pitcher */
export const OFFENSIVE_KEYS: Set<string> = new Set([
    ...POSITIONS.batting.map((p) => p.key),
    "PITCHER",
]);

/** Defensive positions: infield (minus pitcher) + outfield */
export const DEFENSIVE_KEYS: Set<string> = new Set([
    ...POSITIONS.infield.filter((p) => p.key !== "PITCHER").map((p) => p.key),
    ...POSITIONS.outfield.map((p) => p.key),
]);

// ── Data types ───────────────────────────────────────────────────

export interface FieldingData {
    innings: number;
    unique: boolean;
    assignments: Record<number, Record<string, string | null>>;
}

export const DEFAULT_INNINGS = 7;

export function parseData(viewData: unknown): FieldingData {
    if (
        viewData &&
        typeof viewData === "object" &&
        "innings" in viewData &&
        "assignments" in viewData
    ) {
        const d = viewData as FieldingData;
        return { innings: d.innings, unique: d.unique ?? true, assignments: d.assignments };
    }
    return { innings: DEFAULT_INNINGS, unique: true, assignments: {} };
}

export function getEffectiveAssignment(
    data: FieldingData,
    inning: number,
    position: string,
): string | null {
    // Check current inning first
    const current = data.assignments[inning]?.[position];
    if (current !== undefined) return current;
    // Inherit from previous inning
    if (inning > 1) return getEffectiveAssignment(data, inning - 1, position);
    return null;
}

// ── Fielding Matrix (external store for cell-level subscriptions) ──

type CellKey = `${number}:${string}`;
type Listener = () => void;

/**
 * External store powering the fielding editor grid.
 * Each cell subscribes individually via useSyncExternalStore so that
 * assigning one dropdown only re-renders the affected cells — not the
 * entire 13-position × N-innings grid.
 */
export class FieldingMatrix {
    private data: Record<number, Record<string, string>>;
    private unique: boolean;
    private listeners = new Map<CellKey, Set<Listener>>();
    private inningListeners = new Map<number, Set<Listener>>();
    private globalListeners = new Set<Listener>();

    constructor(assignments: FieldingData["assignments"], unique: boolean) {
        // Deep-copy, filtering nulls
        this.data = {};
        for (const [inning, positions] of Object.entries(assignments)) {
            const i = Number(inning);
            this.data[i] = {};
            for (const [pos, userId] of Object.entries(positions)) {
                if (userId) this.data[i][pos] = userId;
            }
        }
        this.unique = unique;
    }

    setUnique(unique: boolean) {
        this.unique = unique;
    }

    getCell(inning: number, position: string): string | null {
        return this.data[inning]?.[position] ?? null;
    }

    assign(inning: number, position: string, userId: string | null): void {
        if (!this.data[inning]) this.data[inning] = {};

        let unsetPosition: string | null = null;

        // Unique: unassign user from other position in same group (offensive/defensive)
        if (userId && this.unique) {
            const sameGroup = OFFENSIVE_KEYS.has(position) ? OFFENSIVE_KEYS : DEFENSIVE_KEYS;
            for (const [pos, assignedId] of Object.entries(this.data[inning])) {
                if (pos !== position && assignedId === userId && sameGroup.has(pos)) {
                    delete this.data[inning][pos];
                    unsetPosition = pos;
                    break;
                }
            }
        }

        if (userId === null) {
            delete this.data[inning][position];
        } else {
            this.data[inning][position] = userId;
        }

        // Notify affected cells
        this.notify(inning, position);
        if (unsetPosition) this.notify(inning, unsetPosition);
        // Notify inning listeners (taken set changed)
        this.notifyInning(inning);
    }

    /** Get user IDs assigned to other positions in the same group (offensive/defensive) this inning. */
    getTaken(inning: number, excludePosition: string): Set<string> {
        const taken = new Set<string>();
        const inningData = this.data[inning];
        if (!inningData) return taken;
        const sameGroup = OFFENSIVE_KEYS.has(excludePosition) ? OFFENSIVE_KEYS : DEFENSIVE_KEYS;
        for (const [pos, userId] of Object.entries(inningData)) {
            if (pos !== excludePosition && sameGroup.has(pos) && userId) taken.add(userId);
        }
        return taken;
    }

    /** Export final data for saving (omits empty innings). */
    export(): FieldingData["assignments"] {
        const result: Record<number, Record<string, string>> = {};
        for (const [inning, positions] of Object.entries(this.data)) {
            if (Object.keys(positions).length > 0) {
                result[Number(inning)] = { ...positions };
            }
        }
        return result;
    }

    removeInningsAbove(max: number) {
        for (const key of Object.keys(this.data)) {
            if (Number(key) > max) delete this.data[Number(key)];
        }
    }

    /** For each position, fill unassigned innings after the last assigned inning with that last value. */
    assignAll(totalInnings: number, positions: readonly { key: string }[]) {
        for (const pos of positions) {
            let lastAssignedInning = 0;
            let lastValue: string | null = null;
            for (let i = totalInnings; i >= 1; i--) {
                const val = this.data[i]?.[pos.key];
                if (val) {
                    lastAssignedInning = i;
                    lastValue = val;
                    break;
                }
            }
            if (!lastValue || lastAssignedInning >= totalInnings) continue;
            for (let i = lastAssignedInning + 1; i <= totalInnings; i++) {
                if (!this.data[i]?.[pos.key]) {
                    if (!this.data[i]) this.data[i] = {};
                    this.data[i]![pos.key] = lastValue;
                    this.notify(i, pos.key);
                    this.notifyInning(i);
                }
            }
        }
    }

    /** Clear all assignments across all innings/positions. */
    unassignAll(totalInnings: number, positions: readonly { key: string }[]) {
        for (const pos of positions) {
            for (let i = 1; i <= totalInnings; i++) {
                if (this.data[i]?.[pos.key]) {
                    delete this.data[i]![pos.key];
                    this.notify(i, pos.key);
                    this.notifyInning(i);
                }
            }
        }
    }

    /** Returns true if assignAll would change anything. */
    hasAssignable(totalInnings: number, positions: readonly { key: string }[]): boolean {
        for (const pos of positions) {
            let lastAssignedInning = 0;
            for (let i = totalInnings; i >= 1; i--) {
                if (this.data[i]?.[pos.key]) { lastAssignedInning = i; break; }
            }
            if (lastAssignedInning === 0 || lastAssignedInning >= totalInnings) continue;
            for (let i = lastAssignedInning + 1; i <= totalInnings; i++) {
                if (!this.data[i]?.[pos.key]) return true;
            }
        }
        return false;
    }

    // ── Subscriptions ──

    subscribeCell(inning: number, position: string, listener: Listener): () => void {
        const key: CellKey = `${inning}:${position}`;
        if (!this.listeners.has(key)) this.listeners.set(key, new Set());
        this.listeners.get(key)!.add(listener);
        return () => this.listeners.get(key)?.delete(listener);
    }

    subscribeInning(inning: number, listener: Listener): () => void {
        if (!this.inningListeners.has(inning)) this.inningListeners.set(inning, new Set());
        this.inningListeners.get(inning)!.add(listener);
        return () => this.inningListeners.get(inning)?.delete(listener);
    }

    subscribeGlobal(listener: Listener): () => void {
        this.globalListeners.add(listener);
        return () => this.globalListeners.delete(listener);
    }

    private notify(inning: number, position: string) {
        const key: CellKey = `${inning}:${position}`;
        this.listeners.get(key)?.forEach((l) => l());
        this.globalListeners.forEach((l) => l());
    }

    private notifyInning(inning: number) {
        this.inningListeners.get(inning)?.forEach((l) => l());
    }
}
