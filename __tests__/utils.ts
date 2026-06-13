import { readdirSync } from "fs";
import path from "path";

/** A file-level violation found by a static analysis test. */
export interface FileViolation {
  file: string;
  line: number;
  detail: string;
}

/** Recursively walk a directory and return all files matching a given extension. */
export function walkDir(dir: string, ext: string): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      results.push(...walkDir(full, ext));
    } else if (entry.name.endsWith(ext)) {
      results.push(full);
    }
  }
  return results;
}

/** Format violations into a readable failure message. */
export function formatViolations(violations: FileViolation[]): string {
  return violations
    .map((v) => `  ${v.file}:${v.line}\n    ${v.detail}`)
    .join("\n");
}
