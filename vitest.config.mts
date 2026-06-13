import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": new URL("./__tests__/stubs/server-only.ts", import.meta.url).pathname,
      "next/headers": new URL("./__tests__/stubs/next-headers.ts", import.meta.url).pathname,
    },
  },
  test: {
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "test-key",
    },
  },
});
