-- Allow anonymous (public) reads on sessions.
-- Sessions contain only public event info (title, date, time, location).
-- Signups remain gated by auth.uid() is not null.

drop policy if exists "sessions_read" on public.sessions;

create policy "sessions_read"
  on public.sessions for select
  using (true);
