import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Ensures dialog components include overscroll-contain for mobile scroll safety.
 *
 * Without overscroll-contain, scrolling past the dialog's edges leaks scroll
 * to the body behind it on mobile.
 */

const DIALOG_FILES = ["components/ui/dialog.tsx", "components/ui/alert-dialog.tsx"];

describe("Dialog positioning safety", () => {
  it("should include overscroll-contain on dialog content", () => {
    const root = path.resolve(__dirname, "../..");
    const violations: string[] = [];

    for (const file of DIALOG_FILES) {
      const fullPath = path.join(root, file);
      let content: string;
      try {
        content = readFileSync(fullPath, "utf-8");
      } catch {
        continue;
      }

      // Only check files that have overflow-y-auto (scrollable dialogs)
      if (content.includes("overflow-y-auto") && !content.includes("overscroll-contain")) {
        violations.push(`${file}: Has overflow-y-auto but missing overscroll-contain`);
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Scrollable dialogs must include "overscroll-contain" to prevent ` +
          `scroll chaining to the body on mobile:\n\n` +
          violations.map((v) => `  ${v}`).join("\n"),
      );
    }
  });
});
