"use client";

import { useImperativeHandle, useState, useCallback, useRef, useEffect } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Paragraph from "@tiptap/extension-paragraph";
import { Extension, InputRule } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { Decoration, DecorationSet } from "@tiptap/pm/view";
import { GripVertical, Plus, Eye, EyeOff, MoreVertical, Sparkles } from "lucide-react";
import { DraggableList } from "@/components/ui/draggable-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { Transaction } from "@tiptap/pm/state";
import type { Node as PmNode } from "@tiptap/pm/model";
import type { SessionViewEditorProps } from "../interfaces";
import type {
  DevotionalViewData,
  DevotionalSection,
  DevotionalItem,
  DevotionalSectionType,
} from "./types";
import {
  SECTION_META,
  SECTION_TYPE_OPTIONS,
  generateId,
  createDefaultDevotionalData,
  createTemplateDevotionalData,
} from "./types";

// ── Custom Paragraph with indent + facilitatorOnly attributes ────

const MAX_INDENT = 4;

const IndentParagraph = Paragraph.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      indent: {
        default: 0,
        parseHTML: (element: HTMLElement) =>
          parseInt(element.getAttribute("data-indent") ?? "0", 10),
        renderHTML: (attributes: Record<string, unknown>) => {
          const indent = attributes.indent as number;
          if (!indent) return {};
          return { "data-indent": String(indent) };
        },
      },
      facilitatorOnly: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-facilitator-only") === "true",
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.facilitatorOnly) return {};
          return { "data-facilitator-only": "true" };
        },
      },
    };
  },

  addInputRules() {
    return [
      // Typing "- " at the start of a line converts to indent 1 (bullet)
      new InputRule({
        find: /^-\s$/,
        handler: ({ state, range, chain }) => {
          const $from = state.doc.resolve(range.from);
          // Only trigger on paragraphs at indent 0
          const node = $from.parent;
          if (node.type.name !== "paragraph" || (node.attrs.indent as number) > 0) return null;

          const paragraphPos = $from.before($from.depth);
          chain()
            .deleteRange({ from: range.from, to: range.to })
            .command(({ tr }: { tr: Transaction }) => {
              tr.setNodeMarkup(paragraphPos, undefined, {
                ...node.attrs,
                indent: 1,
              });
              return true;
            })
            .run();
        },
      }),
    ];
  },
});

/**
 * ProseMirror plugin that adds a gray background decoration to paragraphs
 * with facilitatorOnly=true. Decorations update automatically on doc changes.
 */
const FacilitatorHighlight = Extension.create({
  name: "facilitatorHighlight",
  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("facilitatorHighlight"),
        props: {
          decorations(state) {
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.type.name === "paragraph" && node.attrs.facilitatorOnly) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, {
                    style:
                      "background-color: rgba(0, 0, 0, 0.07); border-radius: 2px; border-left: 3px solid rgba(0, 0, 0, 0.15);",
                  }),
                );
              }
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

// ── Data conversion: DevotionalItem[] ↔ Tiptap ──────────────────

function itemsToHtml(items: DevotionalItem[]): string {
  if (items.length === 0) return "<p></p>";
  return items
    .map((item) => {
      const attrs: string[] = [];
      if (item.indent > 0) attrs.push(`data-indent="${item.indent}"`);
      if (item.facilitatorOnly) attrs.push('data-facilitator-only="true"');
      const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
      const content = formatContent(item.content);
      return `<p${attrStr}>${content}</p>`;
    })
    .join("");
}

function formatContent(text: string): string {
  if (!text) return "<br>";
  const escaped = escapeHtml(text);
  return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

interface TiptapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
  text?: string;
  marks?: { type: string }[];
}

function docToItems(doc: TiptapNode): DevotionalItem[] {
  const items: DevotionalItem[] = [];
  for (const child of doc.content ?? []) {
    if (child.type === "paragraph") {
      items.push({
        id: generateId(),
        content: nodeToText(child),
        indent: (child.attrs?.indent as number) ?? 0,
        facilitatorOnly: child.attrs?.facilitatorOnly === true,
      });
    }
  }
  return items;
}

function nodeToText(node: TiptapNode): string {
  if (!node.content) return "";
  return node.content
    .map((child) => {
      if (child.type === "text") {
        const text = child.text ?? "";
        if (child.marks?.some((m) => m.type === "bold")) {
          return `**${text}**`;
        }
        return text;
      }
      return "";
    })
    .join("");
}

// ── Section Editor Component ─────────────────────────────────────

function SectionEditor({
  section,
  onItemsChange,
  onMetaChange,
  onDelete,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  isDragging,
  handleRef,
  handleListeners,
}: {
  section: DevotionalSection;
  onItemsChange: (items: DevotionalItem[]) => void;
  onMetaChange: (updates: Partial<DevotionalSection>) => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  isDragging: boolean;
  handleRef: (node: HTMLElement | null) => void;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- dnd-kit listener map
  handleListeners: Record<string, Function> | undefined;
}) {
  const editorRef = useRef<Editor | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        paragraph: false,
        // Disable list features — we use indent on paragraphs
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        blockquote: false,
        codeBlock: false,
        code: false,
        horizontalRule: false,
      }),
      IndentParagraph,
      FacilitatorHighlight,
      Placeholder.configure({
        placeholder: "...",
      }),
    ],
    content: itemsToHtml(section.items),
    editorProps: {
      attributes: {
        class:
          "devotional-tiptap outline-none min-h-[60px] px-3 py-2 text-base md:text-sm leading-relaxed",
      },
      handleKeyDown: (_view: unknown, event: KeyboardEvent) => {
        if (event.key !== "Tab") return false;
        const ed = editorRef.current;
        if (!ed) return false;

        const { $from, $to } = ed.state.selection;

        // Apply indent/outdent to all paragraphs in selection
        // Tab only increases indent on lines already at indent >= 1 (use "- " to create bullets)
        // Shift+Tab always works (can outdent from 1 → 0)
        ed.chain()
          .focus()
          .command(({ tr }: { tr: Transaction }) => {
            tr.doc.nodesBetween($from.pos, $to.pos, (node: PmNode, pos: number) => {
              if (node.type.name === "paragraph") {
                const currentIndent = (node.attrs.indent as number) ?? 0;
                const newIndent = event.shiftKey
                  ? Math.max(0, currentIndent - 1)
                  : currentIndent >= 1
                    ? Math.min(MAX_INDENT, currentIndent + 1)
                    : currentIndent; // don't indent from 0
                if (newIndent !== currentIndent) {
                  tr.setNodeMarkup(pos, undefined, {
                    ...node.attrs,
                    indent: newIndent,
                  });
                }
              }
            });
            return true;
          })
          .run();

        return true; // always capture Tab
      },
      // Handle paste from Google Docs: convert <ul>/<li> to indented paragraphs
      handlePaste: (_view: unknown, event: ClipboardEvent) => {
        const html = event.clipboardData?.getData("text/html");
        if (!html || !html.includes("<li")) return false;

        const ed = editorRef.current;
        if (!ed) return false;

        // Parse pasted HTML and convert list items to indented paragraphs
        const items = parseHtmlToItems(html);
        if (items.length === 0) return false;

        const content = itemsToHtml(items);
        ed.chain().focus().insertContent(content).run();
        return true;
      },
    },
    onUpdate: ({ editor: ed }: { editor: Editor }) => {
      const json = ed.getJSON() as TiptapNode;
      onItemsChange(docToItems(json));
    },
  });

  // Keep ref in sync
  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  /** Whether all items in this section are facilitator-only. */
  const allHiddenFromPlayers =
    section.items.length > 0 && section.items.every((i) => i.facilitatorOnly);

  /** Toggle facilitatorOnly on all paragraphs in the current selection. */
  const toggleCurrentLine = useCallback(() => {
    if (!editor) return;
    const { from, to } = editor.state.selection;

    // Determine new value: if ALL selected paragraphs are already hidden, show them; otherwise hide them
    let allHidden = true;
    editor.state.doc.nodesBetween(from, to, (node) => {
      if (node.type.name === "paragraph" && !node.attrs.facilitatorOnly) {
        allHidden = false;
      }
    });
    const newValue = !allHidden;

    editor
      .chain()
      .focus()
      .command(({ tr }: { tr: Transaction }) => {
        tr.doc.nodesBetween(from, to, (node, pos) => {
          if (node.type.name === "paragraph") {
            tr.setNodeMarkup(pos, undefined, {
              ...node.attrs,
              facilitatorOnly: newValue,
            });
          }
        });
        return true;
      })
      .run();
  }, [editor]);

  /** Toggle all lines in this section. */
  const toggleAllLines = useCallback(() => {
    if (!editor) return;
    const allHidden = section.items.length > 0 && section.items.every((i) => i.facilitatorOnly);
    const newValue = !allHidden;

    editor
      .chain()
      .focus()
      .command(({ tr }: { tr: Transaction }) => {
        tr.doc.descendants((node: PmNode, pos: number) => {
          if (node.type.name === "paragraph") {
            if (node.attrs.facilitatorOnly !== newValue) {
              tr.setNodeMarkup(pos, undefined, {
                ...node.attrs,
                facilitatorOnly: newValue,
              });
            }
          }
        });
        return true;
      })
      .run();
  }, [editor, section.items]);

  const allFacilitatorOnly =
    section.items.length > 0 && section.items.every((i) => i.facilitatorOnly);

  return (
    <div className={cn("rounded-lg border bg-card transition-opacity", isDragging && "opacity-50")}>
      {/* Section header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b bg-muted/30">
        <div
          className="shrink-0 cursor-grab active:cursor-grabbing touch-none"
          ref={handleRef}
          {...handleListeners}
          aria-label="Drag to reorder section"
        >
          <GripVertical className="h-3.5 w-3.5 text-muted-foreground" />
        </div>

        <span className="text-sm shrink-0">{SECTION_META[section.type].emoji}</span>

        <Input
          value={section.customTitle ?? SECTION_META[section.type].defaultTitle}
          onChange={(e) => onMetaChange({ customTitle: e.target.value })}
          placeholder="Section title"
          className="h-7 text-base md:text-sm font-medium border-0 shadow-none bg-transparent px-1 focus-visible:ring-1 flex-1"
        />

        {/* Section menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0">
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={toggleAllLines}>
              {allFacilitatorOnly ? (
                <>
                  <Eye className="h-3.5 w-3.5 mr-2" /> Show section
                </>
              ) : (
                <>
                  <EyeOff className="h-3.5 w-3.5 mr-2" /> Hide section
                </>
              )}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveUp} disabled={isFirst}>
              Move Up
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMoveDown} disabled={isLast}>
              Move Down
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onDelete}
              className="text-destructive focus:text-destructive"
            >
              Delete Section
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Passage reference input */}
      {section.type === "passage" && (
        <div className="px-3 pt-2">
          <Input
            placeholder="Passage reference (e.g., Romans 12:1-2)"
            value={section.passageReference ?? ""}
            onChange={(e) => onMetaChange({ passageReference: e.target.value })}
            className="h-8 text-base md:text-sm"
          />
        </div>
      )}

      {/* Tiptap Editor */}
      <div className="relative">
        <div className="sticky top-0 z-10 flex items-center gap-1 px-3 py-1.5 bg-card/95 backdrop-blur-sm border-b">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 text-xs gap-1.5 text-muted-foreground"
            onClick={toggleCurrentLine}
          >
            {allHiddenFromPlayers ? (
              <>
                <Eye className="h-3 w-3" />
                Show line(s) in player view
              </>
            ) : (
              <>
                <EyeOff className="h-3 w-3" />
                Show line(s) for facilitators only
              </>
            )}
          </Button>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

// ── Paste HTML parser (Google Docs / Word) ───────────────────────

function parseHtmlToItems(html: string): DevotionalItem[] {
  if (typeof document === "undefined") return [];
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const items: DevotionalItem[] = [];
  traverseDOM(doc.body, 0, items);
  return items;
}

function traverseDOM(node: Node, depth: number, items: DevotionalItem[]) {
  for (const child of Array.from(node.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent?.trim();
      if (text) {
        items.push({
          id: generateId(),
          content: text,
          indent: depth,
          facilitatorOnly: false,
        });
      }
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const el = child as HTMLElement;
      const tag = el.tagName.toLowerCase();

      if (tag === "ul" || tag === "ol") {
        traverseDOM(el, depth + 1, items);
      } else if (tag === "li") {
        // Get direct text content (not from nested lists)
        const directText = getDirectText(el);
        if (directText) {
          items.push({
            id: generateId(),
            content: directText,
            indent: depth,
            facilitatorOnly: false,
          });
        }
        // Process nested lists
        for (const liChild of Array.from(el.children)) {
          const liTag = liChild.tagName.toLowerCase();
          if (liTag === "ul" || liTag === "ol") {
            traverseDOM(liChild, depth + 1, items);
          }
        }
      } else if (tag === "p" || tag === "div") {
        const text = el.textContent?.trim();
        if (text) {
          items.push({
            id: generateId(),
            content: text,
            indent: depth,
            facilitatorOnly: false,
          });
        }
      } else {
        traverseDOM(el, depth, items);
      }
    }
  }
}

function getDirectText(el: HTMLElement): string {
  let text = "";
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      text += child.textContent ?? "";
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as HTMLElement).tagName.toLowerCase();
      if (tag !== "ul" && tag !== "ol") {
        text += (child as HTMLElement).textContent ?? "";
      }
    }
  }
  return text.trim();
}

// ── Main Editor ──────────────────────────────────────────────────

export default function DevotionalEditor({ viewData, ref }: SessionViewEditorProps) {
  const initialData = (viewData as DevotionalViewData | null) ?? createDefaultDevotionalData();
  const [data, setData] = useState<DevotionalViewData>(initialData);

  useImperativeHandle(ref, () => ({
    getCurrentData: () => data,
  }));

  const updateSection = useCallback((sectionId: string, updates: Partial<DevotionalSection>) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) => (s.id === sectionId ? { ...s, ...updates } : s)),
    }));
  }, []);

  const deleteSection = (sectionId: string) => {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
  };

  const moveSection = (index: number, direction: -1 | 1) => {
    setData((prev) => {
      const next = [...prev.sections];
      const target = index + direction;
      if (target < 0 || target >= next.length) return prev;
      const temp = next[target]!;
      next[target] = next[index]!;
      next[index] = temp;
      return { ...prev, sections: next };
    });
  };

  const addSection = (type: DevotionalSectionType) => {
    setData((prev) => ({
      ...prev,
      sections: [
        ...prev.sections,
        {
          id: generateId(),
          type,
          items: [],
          ...(type === "custom" ? { customTitle: "" } : {}),
        },
      ],
    }));
  };

  const loadTemplate = () =>
    setData((prev) => ({ ...createTemplateDevotionalData(), title: prev.title }));

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Scoped styles for indent levels and facilitator-only */}
      <style>{`
                .devotional-tiptap p {
                    margin: 0.125rem 0;
                    position: relative;
                }
                .devotional-tiptap p[data-indent="1"] {
                    padding-left: 1.5rem;
                }
                .devotional-tiptap p[data-indent="2"] {
                    padding-left: 3rem;
                }
                .devotional-tiptap p[data-indent="3"] {
                    padding-left: 4.5rem;
                }
                .devotional-tiptap p[data-indent="4"] {
                    padding-left: 6rem;
                }
                .devotional-tiptap p[data-indent="1"]::before,
                .devotional-tiptap p[data-indent="2"]::before,
                .devotional-tiptap p[data-indent="3"]::before,
                .devotional-tiptap p[data-indent="4"]::before {
                    content: "•";
                    position: absolute;
                    left: calc((attr(data-indent type(<integer>), 1) - 1) * 1.5rem + 0.5rem);
                    color: hsl(var(--muted-foreground));
                }
                .devotional-tiptap p[data-indent="1"]::before { left: 0.5rem; }
                .devotional-tiptap p[data-indent="2"]::before { left: 2rem; }
                .devotional-tiptap p[data-indent="3"]::before { left: 3.5rem; }
                .devotional-tiptap p[data-indent="4"]::before { left: 5rem; }
                .devotional-tiptap p.is-editor-empty:first-child::before {
                    content: attr(data-placeholder) !important;
                    float: left;
                    color: hsl(var(--muted-foreground));
                    opacity: 0.5;
                    pointer-events: none;
                    height: 0;
                    position: static;
                }
            `}</style>

      {/* Title */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium">Title</label>
        <Input
          placeholder="e.g., Spiritual Worship"
          value={data.title}
          onChange={(e) => setData((d) => ({ ...d, title: e.target.value }))}
        />
      </div>

      {/* Sections */}
      {data.sections.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 border rounded-lg border-dashed overflow-hidden">
          <p className="text-sm text-muted-foreground">No sections yet</p>
          <div className="flex flex-wrap justify-center gap-2 px-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="text-xs"
              onClick={loadTemplate}
            >
              <Sparkles className="h-3.5 w-3.5 mr-1" />
              Start from template
            </Button>
            <AddSectionPicker onAdd={addSection} />
          </div>
        </div>
      ) : (
        <DraggableList
          naked
          items={data.sections}
          keyExtractor={(s) => s.id}
          onReorder={(sections) => setData((prev) => ({ ...prev, sections }))}
          className="space-y-3"
          renderItem={(section, idx, nakedCtx) => {
            const { dragItemProps, dragHandleProps, isDragging } = nakedCtx!;
            return (
              <div ref={dragItemProps.ref} style={dragItemProps.style}>
                <SectionEditor
                  section={section}
                  onItemsChange={(items) => updateSection(section.id, { items })}
                  onMetaChange={(updates) => updateSection(section.id, updates)}
                  onDelete={() => deleteSection(section.id)}
                  onMoveUp={() => moveSection(idx, -1)}
                  onMoveDown={() => moveSection(idx, 1)}
                  isFirst={idx === 0}
                  isLast={idx === data.sections.length - 1}
                  isDragging={isDragging}
                  handleRef={dragHandleProps.ref}
                  handleListeners={dragHandleProps.listeners}
                />
              </div>
            );
          }}
        />
      )}

      {/* Add section picker (when sections exist) */}
      {data.sections.length > 0 && <AddSectionPicker onAdd={addSection} />}
    </div>
  );
}

DevotionalEditor.dialogClassName = "sm:max-w-3xl sm:max-h-[90vh] overflow-y-auto";

// ── Add Section Picker ───────────────────────────────────────────

function AddSectionPicker({ onAdd }: { onAdd: (type: DevotionalSectionType) => void }) {
  return (
    <Select value="" onValueChange={(val) => onAdd(val as DevotionalSectionType)}>
      <SelectTrigger size="sm" className="text-base md:text-xs w-auto">
        <Plus className="h-3.5 w-3.5 mr-1" />
        <SelectValue placeholder="Add section" />
      </SelectTrigger>
      <SelectContent>
        {SECTION_TYPE_OPTIONS.map((type) => (
          <SelectItem key={type} value={type}>
            {SECTION_META[type].emoji} {SECTION_META[type].defaultTitle}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
