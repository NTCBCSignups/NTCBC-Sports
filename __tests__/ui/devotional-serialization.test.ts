import { describe, it, expect } from "vitest";
import {
  itemsToHtml,
  formatContent,
  docToItems,
  nodeToText,
  type TiptapNode,
} from "@/components/sports/session/session-views/devotional-view";
import type { DevotionalItem } from "@/components/sports/session/session-views/devotional-view/types";

// ── nodeToText ───────────────────────────────────────────────────

describe("nodeToText", () => {
  it("returns empty string for node with no content", () => {
    expect(nodeToText({ type: "paragraph" })).toBe("");
  });

  it("extracts plain text", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [{ type: "text", text: "hello world" }],
    };
    expect(nodeToText(node)).toBe("hello world");
  });

  it("wraps bold text in ** markers", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "before " },
        { type: "text", text: "bold", marks: [{ type: "bold" }] },
        { type: "text", text: " after" },
      ],
    };
    expect(nodeToText(node)).toBe("before **bold** after");
  });

  it("converts hardBreak to newline", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "line one" },
        { type: "hardBreak" },
        { type: "text", text: "line two" },
      ],
    };
    expect(nodeToText(node)).toBe("line one\nline two");
  });

  it("handles multiple hardBreaks", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "a" },
        { type: "hardBreak" },
        { type: "text", text: "b" },
        { type: "hardBreak" },
        { type: "text", text: "c" },
      ],
    };
    expect(nodeToText(node)).toBe("a\nb\nc");
  });

  it("ignores unknown node types", () => {
    const node: TiptapNode = {
      type: "paragraph",
      content: [
        { type: "text", text: "hello" },
        { type: "unknownWidget" },
        { type: "text", text: " world" },
      ],
    };
    expect(nodeToText(node)).toBe("hello world");
  });
});

// ── formatContent ────────────────────────────────────────────────

describe("formatContent", () => {
  it("returns <br> for empty string", () => {
    expect(formatContent("")).toBe("<br>");
  });

  it("escapes HTML entities", () => {
    expect(formatContent("A & B < C > D")).toBe("A &amp; B &lt; C &gt; D");
  });

  it("converts **bold** markers to <strong> tags", () => {
    expect(formatContent("say **hello** world")).toBe("say <strong>hello</strong> world");
  });

  it("converts newlines to <br> tags", () => {
    expect(formatContent("line one\nline two")).toBe("line one<br>line two");
  });

  it("handles bold and newlines together", () => {
    expect(formatContent("**bold**\nnext line")).toBe("<strong>bold</strong><br>next line");
  });

  it("escapes HTML inside bold markers", () => {
    expect(formatContent("**a & b**")).toBe("<strong>a &amp; b</strong>");
  });
});

// ── itemsToHtml ──────────────────────────────────────────────────

describe("itemsToHtml", () => {
  it("returns empty paragraph for empty array", () => {
    expect(itemsToHtml([])).toBe("<p></p>");
  });

  it("renders plain items as <p> elements", () => {
    const items: DevotionalItem[] = [
      { id: "1", content: "hello", indent: 0, facilitatorOnly: false },
    ];
    expect(itemsToHtml(items)).toBe("<p>hello</p>");
  });

  it("includes data-indent attribute for indented items", () => {
    const items: DevotionalItem[] = [
      { id: "1", content: "bullet", indent: 2, facilitatorOnly: false },
    ];
    expect(itemsToHtml(items)).toBe('<p data-indent="2">bullet</p>');
  });

  it("includes data-facilitator-only for hidden items", () => {
    const items: DevotionalItem[] = [
      { id: "1", content: "secret", indent: 0, facilitatorOnly: true },
    ];
    expect(itemsToHtml(items)).toBe('<p data-facilitator-only="true">secret</p>');
  });

  it("includes both attributes when indent > 0 and facilitatorOnly", () => {
    const items: DevotionalItem[] = [
      { id: "1", content: "both", indent: 1, facilitatorOnly: true },
    ];
    expect(itemsToHtml(items)).toBe('<p data-indent="1" data-facilitator-only="true">both</p>');
  });

  it("preserves newlines as <br> in content", () => {
    const items: DevotionalItem[] = [
      { id: "1", content: "line one\nline two", indent: 0, facilitatorOnly: false },
    ];
    expect(itemsToHtml(items)).toBe("<p>line one<br>line two</p>");
  });
});

// ── docToItems ───────────────────────────────────────────────────

describe("docToItems", () => {
  it("returns empty array for doc with no content", () => {
    expect(docToItems({ type: "doc" })).toEqual([]);
  });

  it("converts paragraphs to items", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "hello" }],
        },
      ],
    };
    const items = docToItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!.content).toBe("hello");
    expect(items[0]!.indent).toBe(0);
    expect(items[0]!.facilitatorOnly).toBe(false);
  });

  it("reads indent from attrs", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { indent: 3 },
          content: [{ type: "text", text: "deep" }],
        },
      ],
    };
    expect(docToItems(doc)[0]!.indent).toBe(3);
  });

  it("reads facilitatorOnly from attrs", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          attrs: { facilitatorOnly: true },
          content: [{ type: "text", text: "hidden" }],
        },
      ],
    };
    expect(docToItems(doc)[0]!.facilitatorOnly).toBe(true);
  });

  it("skips non-paragraph nodes", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        { type: "heading", content: [{ type: "text", text: "skip me" }] },
        { type: "paragraph", content: [{ type: "text", text: "keep me" }] },
      ],
    };
    const items = docToItems(doc);
    expect(items).toHaveLength(1);
    expect(items[0]!.content).toBe("keep me");
  });

  it("preserves hardBreak as newline in content", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            { type: "text", text: "verse 1" },
            { type: "hardBreak" },
            { type: "text", text: "verse 2" },
          ],
        },
      ],
    };
    expect(docToItems(doc)[0]!.content).toBe("verse 1\nverse 2");
  });

  it("assigns unique IDs to each item", () => {
    const doc: TiptapNode = {
      type: "doc",
      content: [
        { type: "paragraph", content: [{ type: "text", text: "a" }] },
        { type: "paragraph", content: [{ type: "text", text: "b" }] },
        { type: "paragraph", content: [{ type: "text", text: "c" }] },
      ],
    };
    const ids = docToItems(doc).map((i) => i.id);
    expect(new Set(ids).size).toBe(3);
  });
});

// ── Round-trip: items → HTML → Tiptap JSON → items ──────────────

describe("round-trip consistency", () => {
  // We can't run a full Tiptap editor in vitest, but we CAN verify that
  // itemsToHtml output, when parsed back via docToItems with a matching
  // TiptapNode structure, reproduces the semantic content.

  function simulateRoundTrip(items: DevotionalItem[]): DevotionalItem[] {
    // items → HTML → manually construct the TiptapNode that Tiptap would
    // produce from that HTML, then docToItems it back.
    // This tests the data contract between the two functions.
    const tiptapDoc: TiptapNode = {
      type: "doc",
      content: items.map((item) => {
        const content: TiptapNode[] = [];
        // Split on \n to simulate hardBreaks
        const lines = item.content.split("\n");
        lines.forEach((line, idx) => {
          if (idx > 0) content.push({ type: "hardBreak" });
          // Split on bold markers
          const parts = line.split(/(\*\*[^*]+\*\*)/g);
          for (const part of parts) {
            if (!part) continue;
            if (part.startsWith("**") && part.endsWith("**")) {
              content.push({
                type: "text",
                text: part.slice(2, -2),
                marks: [{ type: "bold" }],
              });
            } else {
              content.push({ type: "text", text: part });
            }
          }
        });
        return {
          type: "paragraph",
          attrs: {
            indent: item.indent,
            facilitatorOnly: item.facilitatorOnly,
          },
          content: content.length > 0 ? content : undefined,
        };
      }),
    };
    return docToItems(tiptapDoc);
  }

  it("preserves plain content through round-trip", () => {
    const items: DevotionalItem[] = [
      { id: "x", content: "hello world", indent: 0, facilitatorOnly: false },
    ];
    const result = simulateRoundTrip(items);
    expect(result[0]!.content).toBe("hello world");
    expect(result[0]!.indent).toBe(0);
    expect(result[0]!.facilitatorOnly).toBe(false);
  });

  it("preserves bold markers through round-trip", () => {
    const items: DevotionalItem[] = [
      { id: "x", content: "say **hello** world", indent: 0, facilitatorOnly: false },
    ];
    expect(simulateRoundTrip(items)[0]!.content).toBe("say **hello** world");
  });

  it("preserves newlines through round-trip", () => {
    const items: DevotionalItem[] = [
      { id: "x", content: "line one\nline two\nline three", indent: 0, facilitatorOnly: false },
    ];
    expect(simulateRoundTrip(items)[0]!.content).toBe("line one\nline two\nline three");
  });

  it("preserves indent and facilitatorOnly through round-trip", () => {
    const items: DevotionalItem[] = [
      { id: "x", content: "bullet", indent: 2, facilitatorOnly: true },
    ];
    const result = simulateRoundTrip(items);
    expect(result[0]!.indent).toBe(2);
    expect(result[0]!.facilitatorOnly).toBe(true);
  });

  it("preserves multiple items with mixed attributes", () => {
    const items: DevotionalItem[] = [
      { id: "a", content: "intro", indent: 0, facilitatorOnly: false },
      { id: "b", content: "**key point**", indent: 1, facilitatorOnly: false },
      { id: "c", content: "facilitator note\nwith newline", indent: 0, facilitatorOnly: true },
    ];
    const result = simulateRoundTrip(items);
    expect(result).toHaveLength(3);
    expect(result[0]!.content).toBe("intro");
    expect(result[1]!.content).toBe("**key point**");
    expect(result[1]!.indent).toBe(1);
    expect(result[2]!.content).toBe("facilitator note\nwith newline");
    expect(result[2]!.facilitatorOnly).toBe(true);
  });
});
