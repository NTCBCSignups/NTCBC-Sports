import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { walkDir, formatViolations, type FileViolation } from "../utils";

/**
 * Scans all .tsx files for CSS Grid containers inside forms or containing
 * form inputs and ensures they have min-w-0 to prevent child overflow.
 *
 * Without min-w-0, grid children inherit `min-width: auto` and cannot shrink
 * below their content's intrinsic width — causing horizontal overflow on mobile
 * when inputs (especially datetime-local) are wider than the viewport minus padding.
 *
 * Only flags grids that are likely to contain constrained content (inside <form>
 * tags or containing <Input, <Select, <Textarea elements).
 */

function findViolations(): FileViolation[] {
  const root = path.resolve(__dirname, "../..");
  const componentsDir = path.join(root, "components");
  const appDir = path.join(root, "app");
  const files = [...walkDir(componentsDir, ".tsx"), ...walkDir(appDir, ".tsx")];
  const violations: FileViolation[] = [];

  for (const file of files) {
    const content = readFileSync(file, "utf-8");
    const lines = content.split("\n");

    // Only check files that contain form-related elements
    if (!/(<form|<Input|<Select|<Textarea)/i.test(content)) continue;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const classMatches = [...line.matchAll(/className="([^"]*\bgrid\b[^"]*)"/g)];

      for (const match of classMatches) {
        const classes = match[1];
        // Only flag grids that define responsive column layouts
        if (!/(?:sm|md|lg|xl|2xl)?:?grid-cols-/.test(classes)) continue;
        // Check if min-w-0 is present (either on grid or as child selector)
        if (/min-w-0/.test(classes)) continue;
        if (/\[&>?\*\]:min-w-0/.test(classes)) continue;

        // Check surrounding context (±20 lines) for form input elements
        const start = Math.max(0, i - 5);
        const end = Math.min(lines.length, i + 20);
        const context = lines.slice(start, end).join("\n");
        if (!/<(Input|Select|Textarea|input)\b/.test(context)) continue;

        violations.push({
          file: path.relative(root, file),
          line: i + 1,
          detail: classes.length > 80 ? classes.slice(0, 80) + "…" : classes,
        });
      }
    }
  }

  return violations;
}

describe("grid containers prevent child overflow", () => {
  it("all grid-cols containers should have min-w-0", () => {
    const violations = findViolations();

    if (violations.length > 0) {
      expect.fail(
        `${violations.length} grid container(s) missing min-w-0 (prevents mobile overflow):\n${formatViolations(violations)}`,
      );
    }
  });
});
