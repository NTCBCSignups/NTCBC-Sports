import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";

/**
 * Ensures dialog components use inset-based centering (not translate-based)
 * and include overscroll-contain for mobile scroll safety.
 *
 * translate-based centering (top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%])
 * breaks on iOS when the page is zoomed — the dialog escapes the viewport
 * and scrolling stops working.
 *
 * The fix is: `fixed inset-0 m-auto` which stays within viewport bounds.
 */

const DIALOG_FILES = ["components/ui/dialog.tsx", "components/ui/alert-dialog.tsx"];

describe("Dialog positioning safety", () => {
  it("should not use translate-based centering in dialog content", () => {
    const root = path.resolve(__dirname, "../..");
    const violations: string[] = [];

    for (const file of DIALOG_FILES) {
      const fullPath = path.join(root, file);
      let content: string;
      try {
        content = readFileSync(fullPath, "utf-8");
      } catch {
        continue; // File might not exist
      }

      if (content.includes("translate-x-[-50%]") || content.includes("translate-y-[-50%]")) {
        violations.push(`${file}: Uses translate-based centering — use "inset-0 m-auto" instead`);
      }

      if (content.includes("top-[50%]") && content.includes("left-[50%]")) {
        violations.push(`${file}: Uses top/left 50% positioning — use "inset-0 m-auto" instead`);
      }
    }

    if (violations.length > 0) {
      expect.fail(
        `Dialog centering must use "fixed inset-0 m-auto" (not translate-based) ` +
          `to prevent iOS scroll issues when zoomed:\n\n` +
          violations.map((v) => `  ${v}`).join("\n"),
      );
    }
  });

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
