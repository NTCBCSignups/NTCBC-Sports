## Principal Engineer Code Quality Review

### Executive Summary

This is a well-architected Next.js App Router project with strong conventions (data-driven config, centralized queries, clean auth). The surrounding infrastructure to *keep* it good is partially in place — testing and CI are now covered. Remaining gaps are linting/formatting and some minor organizational/security items.

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

Add Prettier with a `.prettierrc` and integrate both into a `lint-staged` pre-commit hook so nothing unformatted lands on `main`.

---

### 2. File Organization — **Remaining Friction**

| Issue | Suggestion |
|-------|------------|
| settings-unsaved-guard.ts uses global `window.SETTINGS_DIRTY` | Replace with React context or a zustand atom. Global mutation on `window` is fragile and untestable. |
| page.tsx and page.tsx are legacy routes that duplicate the same pattern | Consider a redirect to `[sport]` once these migrate to DB config, or use a route group `(legacy)` to signal intent. |

---

### 3. Security — **Remaining**

| Issue | Assessment |
|-------|-----------|
| No CSP headers configured | Consider next.config.ts headers for `Content-Security-Policy`. |
| Middleware forwards full user JSON as header | The `x-supabase-user` header could be large. Consider forwarding only `user.id` and looking up profile server-side if needed. |

---

### 4. Remaining DX Items

| Missing | Value |
|---------|-------|
| **No `knip` or `ts-prune`** | Dead-code finder in CI catches unused exports automatically. |

---

### Priority Ranking (effort vs. value)

| Priority | Action | Effort |
|----------|--------|--------|
| 1 | Add ESLint flat config + Prettier + lint-staged | 30 min |
| 2 | Add `knip` for dead code detection | 10 min |
| 3 | CSP headers + middleware user forwarding cleanup | 30 min |