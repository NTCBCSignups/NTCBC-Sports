-- Public schedule: allow anonymous (and authenticated) users to read sessions
-- so sport pages and session cards work when logged out. Writes stay sport-admin-only.

drop policy if exists "sessions_read" on public.sessions;

create policy "sessions_read"
  on public.sessions for select
  using (true);
