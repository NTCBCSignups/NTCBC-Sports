-- Calendar usage tracking.
-- Records when users first access their calendar subscription or download,
-- and the most recent access. One row per (user, sport, mode) — upsert pattern.

create table public.calendar_tracking (
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null,
  mode text not null check (mode in ('subscribe', 'download')),
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  primary key (user_id, sport, mode)
);

-- Index for admin stats queries that filter by sport
create index calendar_tracking_sport_idx on public.calendar_tracking (sport);

-- Enable RLS
alter table public.calendar_tracking enable row level security;

-- Users can read their own rows
create policy "Users can read own calendar tracking"
  on public.calendar_tracking for select
  to authenticated
  using ((select auth.uid()) = user_id);

-- Users can insert their own rows
create policy "Users can insert own calendar tracking"
  on public.calendar_tracking for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

-- Users can update their own rows (for upsert)
create policy "Users can update own calendar tracking"
  on public.calendar_tracking for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Sport admins can read all rows for their sport (for stats page)
create policy "Sport admins can read sport calendar tracking"
  on public.calendar_tracking for select
  to authenticated
  using (public.is_sport_admin((select auth.uid()), sport));

-- Grant access to roles
grant select, insert, update on public.calendar_tracking to authenticated;
grant all on public.calendar_tracking to service_role;
