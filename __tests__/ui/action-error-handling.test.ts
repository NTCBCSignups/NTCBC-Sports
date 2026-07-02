import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import path from "path";
import { walkDir, formatViolations, type FileViolation } from "../utils";

/**
 * Ensures all server action calls in client components capture the result.
 *
 * Pattern that's BAD (fire-and-forget, swallows errors):
 *   await someServerAction(args);
 *
 * Pattern that's GOOD (captures result for error handling):
 *   const result = await someServerAction(args);
 *
 * This test scans for `await` calls to functions imported from `@/lib/actions/`
 * that don't assign the result to a variable.
 */

describe("server action error handling", () => {
  it("all server action calls must capture the result", () => {
    const root = path.resolve(__dirname, "../..");
    const violations: FileViolation[] = [];

    for (const fullPath of walkDir(root, ".tsx")) {
      const file = path.relative(root, fullPath);
      // Only check client components (where actions are called)
      const content = readFileSync(fullPath, "utf-8");
      if (!content.includes('"use client"')) continue;
      if (!content.includes("@/lib/actions/")) continue;

      // Extract imported action function names from @/lib/actions/*
      const importRe = /import\s*\{([^}]+)\}\s*from\s*["']@\/lib\/actions\/[^"']+["']/g;
      const actionNames: string[] = [];
      let importMatch: RegExpExecArray | null;
      while ((importMatch = importRe.exec(content)) !== null) {
        const names = importMatch[1]!
          .split(",")
          .map((s) =>
            s
              .trim()
              .split(/\s+as\s+/)
              .pop()!
              .trim(),
          )
          .filter((s) => s && !s.startsWith("type "));
        actionNames.push(...names);
      }

      if (actionNames.length === 0) continue;

      // Check each line for unhandled await calls to these action functions
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const trimmed = line.trim();

        // Skip comments
        if (trimmed.startsWith("//") || trimmed.startsWith("*")) continue;

        for (const name of actionNames) {
          // Match: `await actionName(` NOT preceded by `= ` or `return `
          if (
            trimmed.includes(`await ${name}(`) &&
            !trimmed.includes(`= await ${name}(`) &&
            !trimmed.includes(`return await ${name}(`) &&
            !trimmed.includes(`return ${name}(`)
          ) {
            violations.push({
              file,
              line: i + 1,
              detail: `Unhandled server action result: "${name}" — must capture return value to handle errors`,
            });
          }
        }
      }
    }

    expect(violations, formatViolations(violations)).toHaveLength(0);
  });
});
