import { describe, it, expect } from "vitest";
import {
  createDefaultDevotionalData,
  createTemplateDevotionalData,
  SECTION_META,
  type DevotionalSectionType,
} from "@/components/sports/session/session-views/devotional-view/types";

describe("DevotionalViewData factories", () => {
  it("createDefaultDevotionalData returns empty structure", () => {
    const data = createDefaultDevotionalData();
    expect(data.title).toBe("");
    expect(data.sections).toHaveLength(0);
  });

  it("createTemplateDevotionalData returns all standard section types", () => {
    const data = createTemplateDevotionalData();
    expect(data.title).toBe("");
    expect(data.sections).toHaveLength(5);

    const types = data.sections.map((s) => s.type);
    expect(types).toEqual(["iceBreaker", "passage", "bigIdea", "discussion", "closingReflection"]);
  });

  it("template sections have unique IDs", () => {
    const data = createTemplateDevotionalData();
    const ids = data.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("template sections start with empty items", () => {
    const data = createTemplateDevotionalData();
    for (const section of data.sections) {
      expect(section.items).toEqual([]);
    }
  });

  it("SECTION_META has entries for all template section types", () => {
    const data = createTemplateDevotionalData();
    for (const section of data.sections) {
      const meta = SECTION_META[section.type as DevotionalSectionType];
      expect(meta).toBeDefined();
      expect(meta.emoji).toBeTruthy();
      expect(meta.defaultTitle).toBeTruthy();
    }
  });
});
