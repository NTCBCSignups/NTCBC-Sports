import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "app/**/{page,layout,loading,error,not-found}.tsx",
    "app/api/**/route.ts",
    "lib/actions/**/*.ts",
    "scripts/**/*.ts",
  ],
  project: ["**/*.{ts,tsx}"],
  ignore: ["__tests__/**"],
  ignoreDependencies: ["tw-animate-css", "tailwindcss"],
  // System tools (qrencode, ifconfig, awk) used in npm scripts are not npm packages
  ignoreBinaries: ["qrencode", "ifconfig", "awk"],
  rules: {
    // Fail on structural issues (dead files, missing deps)
    files: "error",
    dependencies: "error",
    devDependencies: "error",
    unlisted: "error",
    // Warn only on exports (shadcn re-exports, typed API clients, test-consumed types)
    exports: "warn",
    types: "warn",
    binaries: "warn",
  },
  next: {
    entry: [
      "next.config.ts",
      "app/**/{page,layout,loading,error,not-found}.tsx",
      "app/api/**/route.ts",
    ],
  },
};

export default config;
