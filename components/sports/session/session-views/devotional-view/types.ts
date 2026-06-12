/** Section types available for devotionals. */
export type DevotionalSectionType =
    | "iceBreaker"
    | "passage"
    | "bigIdea"
    | "discussion"
    | "closingReflection"
    | "custom";

/** Metadata for each section type: emoji + default display title. */
export const SECTION_META: Record<
    DevotionalSectionType,
    { emoji: string; defaultTitle: string }
> = {
    iceBreaker: { emoji: "🧊", defaultTitle: "Ice Breaker" },
    passage: { emoji: "📖", defaultTitle: "Passage" },
    bigIdea: { emoji: "💡", defaultTitle: "Big Idea" },
    discussion: { emoji: "💬", defaultTitle: "Discussion" },
    closingReflection: { emoji: "✨", defaultTitle: "Closing Reflection" },
    custom: { emoji: "📝", defaultTitle: "Custom" },
};

/** Ordered list of section types for the "Add Section" picker. */
export const SECTION_TYPE_OPTIONS: DevotionalSectionType[] = [
    "iceBreaker",
    "passage",
    "bigIdea",
    "discussion",
    "closingReflection",
    "custom",
];

/** A single line/bullet within a section. */
export interface DevotionalItem {
    /** Stable ID for React keys and identity. */
    id: string;
    /** Plain text content. Supports **bold** markers rendered in the viewer. */
    content: string;
    /** Indentation level: 0 = top-level, 1 = sub-bullet, 2 = sub-sub. */
    indent: number;
    /** When true, only admins (facilitators) can see this item. */
    facilitatorOnly: boolean;
}

/** A logical section within the devotional. */
export interface DevotionalSection {
    /** Stable ID for identity across reorders. */
    id: string;
    /** Section type determines emoji + default heading. */
    type: DevotionalSectionType;
    /** Custom title (used when type is 'custom', or to override the default). */
    customTitle?: string;
    /** Passage reference, e.g. "Romans 12:1-2" (only relevant for 'passage' type). */
    passageReference?: string;
    /** Ordered content items within this section. */
    items: DevotionalItem[];
}

/** Top-level data structure stored in StoredViewInstance.data. */
export interface DevotionalViewData {
    /** Devotional title, e.g. "Spiritual Worship". */
    title: string;
    /** Whether the facilitator view toggle defaults to ON for admins. */
    facilitatorViewDefault: boolean;
    /** Ordered sections. */
    sections: DevotionalSection[];
}

/** Returns the display title for a section. */
export function getSectionTitle(section: DevotionalSection): string {
    if (section.customTitle) return section.customTitle;
    return SECTION_META[section.type].defaultTitle;
}

/** Returns the emoji for a section type. */
export function getSectionEmoji(type: DevotionalSectionType): string {
    return SECTION_META[type].emoji;
}

/** Generates a short random ID. */
export function generateId(): string {
    return Math.random().toString(36).slice(2, 10);
}

/** Creates a default empty DevotionalViewData for new views. */
export function createDefaultDevotionalData(): DevotionalViewData {
    return {
        title: "",
        facilitatorViewDefault: true,
        sections: [],
    };
}

/** Creates a template with standard sections pre-populated. */
export function createTemplateDevotionalData(): DevotionalViewData {
    return {
        title: "",
        facilitatorViewDefault: true,
        sections: [
            { id: generateId(), type: "iceBreaker", items: [] },
            { id: generateId(), type: "passage", items: [] },
            { id: generateId(), type: "bigIdea", items: [] },
            { id: generateId(), type: "discussion", items: [] },
            { id: generateId(), type: "closingReflection", items: [] },
        ],
    };
}
