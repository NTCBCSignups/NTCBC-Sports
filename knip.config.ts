import type { KnipConfig } from "knip";

const config: KnipConfig = {
  entry: [
    "app/**/{page,layout,loading,error,not-found}.tsx",
    "app/api/**/route.ts",
    "proxy.ts",
    "lib/actions/**/*.ts",
    "scripts/**/*.ts",
  ],
  project: ["**/*.{ts,tsx}"],
  ignore: ["__tests__/**"],
  ignoreDependencies: ["tw-animate-css", "@tailwindcss/postcss", "tailwindcss"],
  next: {
    entry: [
      "next.config.ts",
      "app/**/{page,layout,loading,error,not-found}.tsx",
      "app/api/**/route.ts",
      "proxy.ts",
    ],
  },
};

export default config;
