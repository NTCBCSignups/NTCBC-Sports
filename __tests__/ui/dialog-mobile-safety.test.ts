import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { walkDir, type FileViolation } from "../utils";

/**
 * Scans all .tsx files for <DialogContent> and <AlertDialogContent> usages and
 * ensures any max-w-* or max-h-* class overrides use a responsive prefix
 * (sm:, md:, lg:, xl:, 2xl:).
 *
 * The base dialog components define mobile-safe constraints:
 *   max-w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)]
 * An unprefixed override (e.g. max-w-[95vw]) causes tailwind-merge to replace
 * them on ALL screen sizes, breaking mobile.
 */

const EXCLUDED = ["components/ui/dialog.tsx", "components/ui/alert-dialog.tsx"];
const RESPONSIVE = /^(?:sm|md|lg|xl|2xl):/;
const TAG_RE = /<(?:Alert)?DialogContent[^>]*>/g;

function findViolations(): FileViolation[] {
  const root = path.resolve(__dirname, "../..");
  const violations: FileViolation[] = [];

  for (const fullPath of walkDir(root, ".tsx")) {
    const file = path.relative(root, fullPath);
    if (EXCLUDED.includes(file)) continue;

    const content = readFileSync(fullPath, "utf-8");
    const tags = content.match(TAG_RE) || [];

    for (const tag of tags) {
      const classes = tag.split(/[\s"'`{}()<>]+/).filter(Boolean);
      for (const cls of classes) {
        if (/^(?:\w+:)*(max-w-|max-h-)/.test(cls) && !RESPONSIVE.test(cls)) {
          violations.push({ file, line: 0, detail: cls });
        }
      }
    }
  }

  return violations;
}

describe("Dialog mobile safety", () => {
  it("should not have unprefixed max-w or max-h overrides on dialog components", () => {
    const violations = findViolations();

    if (violations.length > 0) {
      const msg = violations
        .map((v) => `  ${v.file} — "${v.detail}"`)
        .join("\n");
      expect.fail(
        `Unprefixed max-w/max-h overrides found:\n${msg}\n\n` +
          `Use a responsive prefix (e.g. sm:max-w-lg) to preserve mobile constraints.`,
      );
    }
  });
});
