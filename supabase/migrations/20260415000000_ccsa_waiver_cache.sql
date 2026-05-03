-- ============================================================
-- CCSA player waiver cache
-- Stores CCSA roster data pulled on-demand by admins.
-- ============================================================

create table public.ccsa_players (
  id              uuid primary key default gen_random_uuid(),
  email           text not null unique,
  ccsa_player_id  integer not null,
  first_name      text not null,
  last_name       text not null,
  waiver_status   text not null check (waiver_status in ('valid', 'needs_paper', 'needs_online')),
  synced_at       timestamptz not null default now()
);

create index ccsa_players_email_idx on public.ccsa_players (email);

alter table public.ccsa_players enable row level security;

create policy "Authenticated users can read ccsa_players"
  on public.ccsa_players for select
  using (auth.uid() is not null);

create policy "Admins can manage ccsa_players"
  on public.ccsa_players for all
  using (public.is_admin(auth.uid()));

create policy "Sport admins can manage ccsa_players"
  on public.ccsa_players for all
  using (
    exists (
      select 1 from public.sport_roles
      where user_id = auth.uid() and role = 'admin'
    )
  );
