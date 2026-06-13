import { defineConfig, globalIgnores } from "eslint/config";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import prettier from "eslint-config-prettier/flat";
import eslintComments from "@eslint-community/eslint-plugin-eslint-comments/configs";

const eslintConfig = defineConfig([
  ...nextCoreWebVitals,
  ...nextTypescript,
  prettier,
  eslintComments.recommended,
  {
    rules: {
      "no-console": ["error", { allow: ["error", "warn"] }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // React 19 compiler rules — disabled (false positives on common patterns)
      "react-hooks/purity": "off",
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/static-components": "off",
      // Require a description comment on all eslint-disable directives
      "@eslint-community/eslint-comments/require-description": "error",
    },
  },
  {
    // Enforce unidirectional imports: shared code must never import from sport-specific folders
    files: [
      "lib/**/*.ts",
      "lib/**/*.tsx",
      "components/sports/**/*.ts",
      "components/sports/**/*.tsx",
      "components/ui/**/*.ts",
      "components/ui/**/*.tsx",
      "config/**/*.ts",
    ],
    ignores: [
      // Registry files are the intended wiring points for sport-specific code
      "config/admin-tab-registry.ts",
      "components/sports/session/session-views/registry.ts",
      // Sport-specific lib folders can import their own siblings
      "lib/softball/**",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/softball/*", "@/components/softball/*"],
              message:
                "Generic/shared code must not import from sport-specific folders. Use the registry pattern instead.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores(["scripts/**"]),
]);

export default eslintConfig;
