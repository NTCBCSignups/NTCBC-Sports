import { describe, it, expect } from "vitest";
import { CLIENT_MIGRATIONS } from "@/lib/client-migrations";

describe("CLIENT_MIGRATIONS", () => {
  it("has no expired migrations", () => {
    const now = new Date();
    const expired = CLIENT_MIGRATIONS.filter((m) => new Date(m.expiresAt) < now);

    if (expired.length > 0) {
      const ids = expired.map((m) => `"${m.id}" (expired ${m.expiresAt})`).join(", ");
      expect.fail(`Remove expired client migrations: ${ids}`);
    }
  });

  it("each migration has a valid structure", () => {
    for (const m of CLIENT_MIGRATIONS) {
      expect(m.id).toBeTruthy();
      expect(m.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.script).toBeTruthy();
    }
  });
});
