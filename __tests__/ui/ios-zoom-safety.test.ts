import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { walkDir, type FileViolation } from "../utils";

/**
 * Ensures all focusable elements (inputs, selects, textareas, tiptap editors)
 * use at least 16px font on mobile to prevent iOS Safari auto-zoom.
 *
 * iOS Safari zooms the viewport when a focused element has font-size < 16px.
 * The fix is to use `text-base md:text-sm` (or md:text-xs) instead of bare
 * `text-sm` or `text-xs` on focusable elements.
 *
 * Allowed patterns:
 *   text-base md:text-sm  ✓  (16px on mobile, 14px on desktop)
 *   text-base md:text-xs  ✓  (16px on mobile, 12px on desktop)
 *   text-base             ✓  (16px everywhere)
 *   (no text-size class)  ✓  (inherits, presumably ≥16px)
 *
 * Violations:
 *   text-sm               ✗  (14px on mobile — causes zoom)
 *   text-xs               ✗  (12px on mobile — causes zoom)
 */

// Files that define the base component (they set the responsive pattern)
const ALLOWED_FILES = ["components/ui/input.tsx", "components/ui/input-otp.tsx"];

// Matches bare text-sm or text-xs NOT preceded by a responsive prefix
const SMALL_TEXT_RE = /(?<!\w:)text-(?:sm|xs)/;

// Elements that are focusable and will trigger iOS auto-zoom
const FOCUSABLE_PATTERNS = [
  /<input\b[^>]*className/gi,
  /<Input\b[^>]*className/gi,
  /<textarea\b[^>]*className/gi,
  /<select\b[^>]*className/gi,
  /<SelectTrigger\b[^>]*className/gi,
  /class:\s*["'][^"']*/, // tiptap editorProps.attributes.class
];

function extractClassString(line: string): string | null {
  // Match className="..." or className={cn("...")} or class: "..."
  const match = line.match(/(?:className=["'{](?:cn\()?["']?|class:\s*["'])([^"'})]+)/);
  return match?.[1] ?? null;
}

function findViolations(): FileViolation[] {
  const root = path.resolve(__dirname, "../..");
  const violations: FileViolation[] = [];

  for (const fullPath of walkDir(root, ".tsx")) {
    const file = path.relative(root, fullPath);
    if (ALLOWED_FILES.includes(file)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;

      // Check if this line has a focusable element with a className
      const isFocusable = FOCUSABLE_PATTERNS.some((pattern) => {
        pattern.lastIndex = 0;
        return pattern.test(line);
      });
      if (!isFocusable) continue;

      // Check if the className contains bare text-sm or text-xs
      const classes = extractClassString(line);
      if (!classes) continue;

      // Skip if it already has responsive sizing (md:text-sm means text-base is implied or set)
      if (/(?:sm|md|lg):text-(?:sm|xs)/.test(classes)) continue;

      if (SMALL_TEXT_RE.test(classes)) {
        violations.push({
          file,
          line: i + 1,
          detail: `Focusable element with sub-16px font on mobile (causes iOS auto-zoom): ${classes.trim().slice(0, 60)}`,
        });
      }
    }
  }

  return violations;
}

describe("iOS auto-zoom prevention", () => {
  it("should not have focusable elements with font < 16px on mobile", () => {
    const violations = findViolations();

    if (violations.length > 0) {
      const msg = violations.map((v) => `  ${v.file}:${v.line} — ${v.detail}`).join("\n");
      expect.fail(
        `Found ${violations.length} focusable element(s) with sub-16px font on mobile.\n` +
          `iOS Safari auto-zooms when a focused input has font-size < 16px.\n` +
          `Fix: use "text-base md:text-sm" instead of bare "text-sm":\n\n${msg}`,
      );
    }
  });
});
