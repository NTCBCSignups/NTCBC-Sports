This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Database Migrations

**Source of truth:** every schema change lives as a versioned file in `supabase/migrations/` and is committed to git. The remote `supabase_migrations.schema_migrations` table must always be in lockstep with that folder.

### Rules

- **DO** create every schema change as a tracked migration:

  ```bash
  supabase migration new <snake_case_name>
  # edit the generated supabase/migrations/<timestamp>_<name>.sql
  supabase db push --linked
  ```

  `supabase db push` applies the SQL **and** records the manifest row atomically. This is the only sanctioned path.

- **DO** verify alignment after any DB-touching work:

  ```bash
  supabase migration list --linked   # Local and Remote columns must match
  supabase db push --dry-run --linked # must say "Remote database is up to date"
  ```

- **DO** commit the new migration file in the same PR as any application code that depends on it.

- **DON'T** run schema-changing SQL via the Supabase web SQL editor or `psql` against production. That bypasses the manifest, and `supabase migration list` and `supabase db pull` will silently miss the change. Both tools only inspect `supabase_migrations.schema_migrations`; they do **not** diff actual schema.

- **DON'T** edit a migration file after it has been applied to any environment. If you need to change behavior, write a new migration that supersedes the old one.

- **DON'T** experiment in production. Use `supabase start` for a local Postgres or a Supabase branch DB for ad-hoc exploration; promote successful experiments by writing a real migration.

### Sport config seeding policy

- Keep `sport_configs` schema changes in migrations only. Do not put runtime data inserts in migration files.
- Apply migrations first:

  ```bash
  npx supabase link --project-ref <project_ref>
  npx supabase db push --linked
  ```

- Seed or backfill sport config rows as a **one-time operator task** using a temporary TSX script.
  - Create script under `scripts/`.
  - Run it once with `npx tsx ... --apply`.
  - Delete the script after execution.
  - Do not commit one-time seed scripts.

- Verify seed success with a linked query:

  ```bash
  npx supabase db query --linked "select id, name, auth_enabled from public.sport_configs;"
  ```

### Recovering from drift

If schema changes ever land outside the migration system (e.g. a hotfix run in the SQL editor), reconcile immediately:

1. Add a new migration file containing the SQL that was run.
2. Insert a matching row into `supabase_migrations.schema_migrations` so the CLI considers it applied (the schema is already in place — the row is purely manifest bookkeeping). Use the same `version` and `name` as the file.
3. Verify with `supabase migration list --linked` and `supabase db push --dry-run`.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
