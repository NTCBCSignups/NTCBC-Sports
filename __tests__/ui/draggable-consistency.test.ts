import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { walkDir, type FileViolation } from "../utils";

/**
 * Ensures all drag-and-drop implementations use the shared DraggableList component
 * rather than implementing custom drag handlers inline.
 *
 * Allowed files:
 * - components/ui/draggable-list.tsx (the shared implementation itself)
 *
 * Violations: any .tsx file that has `draggable` attribute or `onDragStart` / `onTouchStart`
 * handlers on an element (indicating custom drag logic outside DraggableList).
 */

const ALLOWED_FILES = ["components/ui/draggable-list.tsx"];

/**
 * Patterns that indicate custom drag-and-drop implementation:
 * - `draggable` as a JSX prop (not inside an import or type)
 * - `onDragStart={` as a JSX event handler
 * - Direct usage of dnd-kit hooks (useSortable, useDraggable) outside the shared component
 */
const DRAGGABLE_PROP_RE = /(?:^|\s)draggable(?:\s|=|$)/;
const ON_DRAG_START_RE = /onDragStart\s*[=({]/;
const DND_KIT_DIRECT_RE = /from\s+["']@dnd-kit\//;
const DRAG_STATE_RE = /drag(?:Index|Idx|Section|ging)/i;

function findViolations(): FileViolation[] {
  const root = path.resolve(__dirname, "../..");
  const violations: FileViolation[] = [];

  for (const fullPath of walkDir(root, ".tsx")) {
    const file = path.relative(root, fullPath);
    if (ALLOWED_FILES.includes(file)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    // Skip files that import DraggableList (they're using it correctly via naked mode
    // which may spread dragHandleProps containing `draggable`)
    if (content.includes('from "@/components/ui/draggable-list"')) continue;
    if (content.includes("from '@/components/ui/draggable-list'")) continue;

    // Check for inline drag implementations
    const hasDragState = DRAG_STATE_RE.test(content);
    const hasDndKitDirect = DND_KIT_DIRECT_RE.test(content);

    if (!hasDragState && !hasDndKitDirect) continue;

    // Direct @dnd-kit import = always a violation (should go through DraggableList)
    if (hasDndKitDirect) {
      const lineIdx = lines.findIndex((l) => DND_KIT_DIRECT_RE.test(l));
      violations.push({
        file,
        line: lineIdx + 1,
        detail: `Direct @dnd-kit import — use DraggableList instead: ${lines[lineIdx]!.trim().slice(0, 80)}`,
      });
      continue;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      if (DRAGGABLE_PROP_RE.test(line) || ON_DRAG_START_RE.test(line)) {
        violations.push({
          file,
          line: i + 1,
          detail: `Custom drag implementation detected — use DraggableList instead: ${line.trim().slice(0, 80)}`,
        });
        break; // One violation per file is enough
      }
    }
  }

  return violations;
}

describe("Draggable consistency", () => {
  it("should not have custom drag implementations outside DraggableList", () => {
    const violations = findViolations();

    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line} — ${v.detail}`).join("\n");
      expect.fail(
        `Found ${violations.length} file(s) with custom drag implementations.\n` +
          `All drag-and-drop must use <DraggableList> from components/ui/draggable-list.tsx:\n\n${msg}`,
      );
    }
  });
});
