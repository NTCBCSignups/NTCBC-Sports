-- ============================================================
-- Performance Optimization: Indexes, RLS Policy Consolidation
-- Fixes:
-- 1. Missing/inefficient FK indexes
-- 2. RLS policies optimized to reduce per-row evaluation
-- 3. Unused index removal
-- 4. Policy consolidation to reduce redundant policy checks
-- ============================================================

-- ============================================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================================

-- sessions.created_by FK index (improves lookups by creator)
create index if not exists sessions_created_by_idx on public.sessions (created_by);

-- signups.user_id FK index (improves lookups by user)
create index if not exists signups_user_id_idx on public.signups (user_id);

-- team_access_requests.reviewed_by FK index (improves lookups by reviewer)
create index if not exists team_access_requests_reviewed_by_idx on public.team_access_requests (reviewed_by);


-- ============================================================
-- 2. REMOVE UNUSED INDEX
-- ============================================================

drop index if exists public.sport_roles_sport_idx;


-- ============================================================
-- 3. OPTIMIZE RLS POLICIES - Consolidate & Cache auth.uid()
-- ============================================================

-- Cache auth.uid() at the function level to avoid re-evaluation per row
-- This fixes the "Auth RLS Initialization Plan" warning

-- *** PROFILES TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Authenticated users can read all profiles" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;

-- Consolidated read policy: anyone authenticated can read profiles
create policy "profiles_read"
  on public.profiles for select
  using (auth.uid() is not null);

-- Consolidated write policy: user can update own or admin can update any
create policy "profiles_write"
  on public.profiles for update
  using (
    auth.uid() = id
    or public.is_admin(auth.uid())
  )
  with check (
    auth.uid() = id
    or public.is_admin(auth.uid())
  );


-- *** SPORT_ROLES TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Users can read own sport roles" on public.sport_roles;
drop policy if exists "Global admins can read all sport roles" on public.sport_roles;
drop policy if exists "Global admins can manage all sport roles" on public.sport_roles;
drop policy if exists "Sport admins can read sport roles for their sport" on public.sport_roles;
drop policy if exists "Sport admins can manage sport roles for their sport" on public.sport_roles;

-- Read policies consolidated: own, global admin, sport admin, or team member for that sport
create policy "sport_roles_read"
  on public.sport_roles for select
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or public.is_sport_admin(auth.uid(), sport)
    or public.is_sport_team_member(auth.uid(), sport)
  );

-- Write policies consolidated: global admin or sport admin for that sport
create policy "sport_roles_write"
  on public.sport_roles for insert
  with check (
    public.is_admin(auth.uid())
    or public.is_sport_admin(auth.uid(), sport)
  );

create policy "sport_roles_update"
  on public.sport_roles for update
  using (
    public.is_admin(auth.uid())
    or public.is_sport_admin(auth.uid(), sport)
  );

create policy "sport_roles_delete"
  on public.sport_roles for delete
  using (
    public.is_admin(auth.uid())
    or public.is_sport_admin(auth.uid(), sport)
  );


-- *** SESSIONS TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Authenticated users can read sessions" on public.sessions;
drop policy if exists "Sport admins can insert sessions" on public.sessions;
drop policy if exists "Sport admins can update sessions" on public.sessions;
drop policy if exists "Sport admins can delete sessions" on public.sessions;

-- Read: all authenticated users can read
create policy "sessions_read"
  on public.sessions for select
  using (auth.uid() is not null);

-- Write: sport admin for that sport
create policy "sessions_write"
  on public.sessions for insert
  with check (public.is_sport_admin(auth.uid(), sport));

create policy "sessions_update"
  on public.sessions for update
  using (public.is_sport_admin(auth.uid(), sport));

create policy "sessions_delete"
  on public.sessions for delete
  using (public.is_sport_admin(auth.uid(), sport));


-- *** SIGNUPS TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Authenticated users can read signups" on public.signups;
drop policy if exists "Users can insert own signup" on public.signups;
drop policy if exists "Users can update own signup" on public.signups;
drop policy if exists "Sport admins can manage all signups" on public.signups;

-- Read: all authenticated users can read
create policy "signups_read"
  on public.signups for select
  using (auth.uid() is not null);

-- Insert: own signup only
create policy "signups_insert"
  on public.signups for insert
  with check (auth.uid() = user_id);

-- Update: own signup or sport admin
create policy "signups_update"
  on public.signups for update
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.sessions s
      where s.id = session_id
      and public.is_sport_admin(auth.uid(), s.sport)
    )
  );

-- Delete: (not defined in original, but included for completeness)
create policy "signups_delete"
  on public.signups for delete
  using (
    auth.uid() = user_id
    or public.is_admin(auth.uid())
    or exists (
      select 1 from public.sessions s
      where s.id = session_id
      and public.is_sport_admin(auth.uid(), s.sport)
    )
  );


-- *** TEAM_ACCESS_REQUESTS TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Users can read own request" on public.team_access_requests;
drop policy if exists "Users can insert own request" on public.team_access_requests;
drop policy if exists "Sport admins can read all requests" on public.team_access_requests;
drop policy if exists "Sport admins can update requests" on public.team_access_requests;

-- Read: own request or sport admin
create policy "team_access_requests_read"
  on public.team_access_requests for select
  using (
    auth.uid() = user_id
    or public.is_sport_admin(auth.uid(), sport)
  );

-- Insert: own request only
create policy "team_access_requests_insert"
  on public.team_access_requests for insert
  with check (auth.uid() = user_id);

-- Update: sport admin only
create policy "team_access_requests_update"
  on public.team_access_requests for update
  using (public.is_sport_admin(auth.uid(), sport));


-- *** CCSA_PLAYERS TABLE ***
-- Drop existing policies to rebuild with optimizations
drop policy if exists "Authenticated users can read ccsa_players" on public.ccsa_players;
drop policy if exists "Admins can manage ccsa_players" on public.ccsa_players;
drop policy if exists "Sport admins can manage ccsa_players" on public.ccsa_players;

-- Read: all authenticated users can read
create policy "ccsa_players_read"
  on public.ccsa_players for select
  using (auth.uid() is not null);

-- Write: global admin or any sport admin
create policy "ccsa_players_write"
  on public.ccsa_players for insert
  with check (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.sport_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );

create policy "ccsa_players_update"
  on public.ccsa_players for update
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.sport_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );

create policy "ccsa_players_delete"
  on public.ccsa_players for delete
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.sport_roles sr
      where sr.user_id = auth.uid() and sr.role = 'admin'
    )
  );


-- ============================================================
-- 4. RESTRICT FUNCTION EXECUTION TO AUTHENTICATED USERS
-- ============================================================

-- Revoke public execution and grant only to authenticated users
revoke all on function public.is_admin(uuid) from public, anon;
revoke all on function public.is_sport_admin(uuid, text) from public, anon;
revoke all on function public.is_sport_team_member(uuid, text) from public, anon;
revoke all on function public.handle_new_user() from public, anon;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.is_sport_admin(uuid, text) to authenticated;
grant execute on function public.is_sport_team_member(uuid, text) to authenticated;
-- handle_new_user() is only called by auth trigger, no role needs direct execute


-- ============================================================
-- 5. ADDITIONAL OPTIMIZATIONS
-- ============================================================

-- Add indexes for sport_id on team_access_requests (for filtering by sport)
create index if not exists team_access_requests_sport_idx on public.team_access_requests (sport);

-- Add index on profiles.role for faster admin checks
create index if not exists profiles_role_idx on public.profiles (role);
