## Principal Engineer Code Quality Review

### Executive Summary

This is a well-architected Next.js App Router project with strong conventions (data-driven config, centralized queries, clean auth). But it's missing **every standard quality gate** that a production codebase should have. The actual application code is good — the surrounding infrastructure to *keep* it good is absent.

---

### 1. Static Analysis & Formatting — **Critical Gap**

| Issue | Impact |
|-------|--------|
| **No ESLint config** (`eslint.config.mjs` missing) | `npm run lint` is a no-op. Zero automated rule enforcement. |
| **No Prettier / formatter config** | Formatting is purely honor-system; inconsistency will creep in with multiple contributors. |
| **No `.editorconfig`** | Contributors with different editors will drift on indent style, line endings. |
| **No `import/no-restricted-paths`** | Your memory codifies "generic code must never import from sport-specific folders" — but nothing enforces it. |
| **No `no-console` rule** | `console.log` in schedule-utils.ts ships to production. |

**Recommendation**: Add a minimal but strict ESLint flat config:

```
eslint-config-next/core-web-vitals
eslint-config-next/typescript
eslint-config-prettier
import/no-restricted-paths (enforce your unidirectional rule)
no-console: warn (with allow: ["error"])
```

Add Prettier with a `.prettierrc` and integrate both into a `lint-staged` + `husky` pre-commit hook so nothing unformatted lands on `main`.

---

### 2. Testing — **Completely Absent**

Zero test files. No testing framework installed. For a project with:
- Complex permission logic (`Role` enum, `AccessLevel` gating, `getUserRole`)
- Server actions with Zod validation + immutability enforcement
- Config resolution logic (`sportConfigFromDbRow`, `getResolvedTab` fallback)

These are **pure functions** that are trivial to unit test with Vitest. The risk: any refactor (like the one you just did) has zero safety net beyond manual verification.

**Recommendation**: Install Vitest (fast, zero-config with Next.js). Start with:
- `config/config-resolver.test.ts` — resolution, `getResolvedTab` fallback, `sportConfigFromDbRow` null cases
- `config/session-tab-rules.test.ts` — immutability validation
- `lib/actions/sport-config.test.ts` — Zod schema edge cases
- `lib/supabase/user.test.ts` — `getUserRole` logic

This gives disproportionate value for minimal effort (pure functions, no mocking needed).

---

### 3. File Organization — **Good, With Friction Points**

**What's working well:**
- app is routing-only (thin pages delegating to components) — matches Next.js recommendation
- lib vs components separation is clean
- Sport-specific code properly siloed in softball, softball
- Config split into interfaces/resolver/data is sound

**Friction:**

| Issue | Suggestion |
|-------|------------|
| sports has **35 files** in a flat directory | Group by concern: `components/sports/session/`, `components/sports/admin/`, `components/sports/signup/`. A flat dir at this size loses scannability. |
| settings-unsaved-guard.ts uses global `window.SETTINGS_DIRTY` | Replace with React context or a zustand atom. Global mutation on `window` is fragile and untestable. |
| page.tsx and page.tsx are legacy routes that duplicate the same pattern | Consider a redirect to `[sport]` once these migrate to DB config, or use a route group `(legacy)` to signal intent. |
| Root-level proxy.ts | Not referenced by next.config.ts. Dead file or misconfigured? |

---

### 4. TypeScript Strictness — **Good Baseline, Can Be Tighter**

`"strict": true` is set (good). Additional compiler flags to consider:

```jsonc
{
  "noUncheckedIndexedAccess": true,  // catches array[0] without null check
  "exactOptionalPropertyTypes": true, // distinguishes undefined from missing
  "noPropertyAccessFromIndexSignature": true // forces bracket notation on index sigs
}
```

The `[key: string]: unknown` index signature on `SportConfigPayload` will bite without `noUncheckedIndexedAccess` — any property access on payload keys will silently be typed as `unknown | ConcreteType` without the compiler catching potential `undefined`.

---

### 5. Error Boundaries — **Missing**

No `error.tsx` or `not-found.tsx` anywhere in the route tree. If a server component throws, users see the default Next.js error page (in production, a blank white page). At minimum:
- `app/error.tsx` — global error boundary with retry button
- `app/not-found.tsx` — branded 404
- `app/[sport]/error.tsx` — sport-specific error handling (e.g., "config not loaded")

---

### 6. Security & Environment Config

| Issue | Assessment |
|-------|-----------|
| `process.env.NEXT_PUBLIC_SUPABASE_URL!` (non-null assertion) | Fine for build-time env, but a runtime `invariant()` would fail fast with a clear message instead of cryptic downstream errors. |
| No CSP headers configured | Consider next.config.ts headers for `Content-Security-Policy`. |
| Middleware forwards full user JSON as header | The `x-supabase-user` header could be large. Consider forwarding only `user.id` and looking up profile server-side if needed. |

---

### 7. Dependency Hygiene

| Issue | Suggestion |
|-------|-----------|
| Many Radix primitives installed individually (`@radix-ui/react-accordion`, etc.) **and** `radix-ui` (the umbrella package) | Pick one. You're shipping duplicate code. |
| `@types/node: "^20"` with Node v26 runtime | Update to `@types/node: "^22"` or `"^26"` to match your actual runtime. |
| No `engines` field in package.json | Contributors on older Node may hit silent incompatibilities. |

---

### 8. DX / CI / Quality Gates

| Missing | Value |
|---------|-------|
| **No CI pipeline** (GitHub Actions) | No automated checks on PRs. Build, lint, typecheck all run only locally. |
| **No `typecheck` script** | Add `"typecheck": "tsc --noEmit"` to package.json and run in CI. |
| **No pre-commit hooks** | `husky` + `lint-staged` = cheap guardrail that prevents formatting/lint issues from ever landing. |
| **No `knip` or `ts-prune`** | You had `SportConfigCoreFields` and `SPORT_CONFIGS_CACHE_TAG` dead code. A dead-code finder in CI catches this automatically. |

---

### 9. Minor Code Smells

- **schedule-utils.ts**: Has `console.log` for environment detection that runs on every request in prod. Should be gated behind a `DEBUG` env var or removed.
- **Dockerfile present but no .dockerignore** — likely shipping node_modules and .next into the build context, slowing builds.

---

### Priority Ranking (effort vs. value)

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Add ESLint flat config + Prettier + lint-staged | 30 min |
| 2 | Add `typecheck` script, run alongside build | 5 min |
| 3 | Add `app/error.tsx` + `app/not-found.tsx` | 15 min |
| 4 | Install Vitest, write tests for pure config/permission functions | 1-2 hr |
| 5 | Add GitHub Actions CI (lint + typecheck + test + build) | 30 min |
| 6 | Subdirectory grouping in sports | 30 min |
| 7 | Add `knip` for dead code detection | 10 min |
| 8 | Add .dockerignore | 5 min |
| 9 | Tighten tsconfig (`noUncheckedIndexedAccess`) | 10 min + fix fallout |
| 10 | Remove duplicate `radix-ui` umbrella package | 5 min |

The codebase conventions are strong and intentional — what's missing is the automation to enforce them. Your memory notes are essentially a manual style guide that should be encoded as linter rules and CI checks.