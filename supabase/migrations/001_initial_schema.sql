-- ============================================================
-- NTCBC Sports — shared schema
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Profiles (extends auth.users) ------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Bypasses RLS to avoid infinite recursion when checking admin status on profiles
create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id and role = 'admin'
  );
$$;

create policy "Authenticated users can read all profiles"
  on public.profiles for select
  using (auth.uid() is not null);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- 2. Sport Roles (per-sport admin + team membership) ------------------

create table public.sport_roles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  sport           text not null,
  role            text not null default 'member' check (role in ('member', 'admin')),
  is_team_member  boolean not null default false,
  created_at      timestamptz not null default now(),
  unique(user_id, sport)
);

create index sport_roles_user_sport_idx on public.sport_roles (user_id, sport);
create index sport_roles_sport_idx on public.sport_roles (sport);

alter table public.sport_roles enable row level security;

-- Checks global admin OR sport-specific admin
create or replace function public.is_sport_admin(p_user_id uuid, p_sport text)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  ) or exists (
    select 1 from public.sport_roles
    where user_id = p_user_id and sport = p_sport and role = 'admin'
  );
$$;

-- Checks global admin, sport admin, or sport team member
create or replace function public.is_sport_team_member(p_user_id uuid, p_sport text)
returns boolean
language sql
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user_id and role = 'admin'
  ) or exists (
    select 1 from public.sport_roles
    where user_id = p_user_id and sport = p_sport and (role = 'admin' or is_team_member = true)
  );
$$;

create policy "Users can read own sport roles"
  on public.sport_roles for select
  using (auth.uid() = user_id);

create policy "Global admins can read all sport roles"
  on public.sport_roles for select
  using (public.is_admin(auth.uid()));

create policy "Global admins can manage all sport roles"
  on public.sport_roles for all
  using (public.is_admin(auth.uid()));

create policy "Sport admins can read sport roles for their sport"
  on public.sport_roles for select
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can manage sport roles for their sport"
  on public.sport_roles for all
  using (public.is_sport_admin(auth.uid(), sport));


-- 3. Sessions ---------------------------------------------------------

create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  sport           text not null,
  session_type    text not null check (session_type in ('scheduled_game', 'drop_in_practice')),
  title           text,
  date            date not null,
  time_start      time not null,
  time_end        time not null,
  location_name   text not null,
  location_address text not null,
  location_maps_link text,
  player_cap      integer,
  signup_open     timestamptz not null,
  signup_close    timestamptz not null,
  notes           text,
  created_by      uuid references public.profiles(id),
  created_at      timestamptz not null default now()
);

create index sessions_sport_date_idx on public.sessions (sport, date);

alter table public.sessions enable row level security;

create policy "Authenticated users can read sessions"
  on public.sessions for select
  using (auth.uid() is not null);

create policy "Sport admins can insert sessions"
  on public.sessions for insert
  with check (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can update sessions"
  on public.sessions for update
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can delete sessions"
  on public.sessions for delete
  using (public.is_sport_admin(auth.uid(), sport));


-- 4. Signups ----------------------------------------------------------

create table public.signups (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'confirmed' check (status in ('confirmed', 'waitlisted', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique(session_id, user_id)
);

create index signups_session_id_idx on public.signups (session_id);
create index signups_session_status_idx on public.signups (session_id, status);

alter table public.signups enable row level security;

create policy "Authenticated users can read signups"
  on public.signups for select
  using (auth.uid() is not null);

create policy "Users can insert own signup"
  on public.signups for insert
  with check (auth.uid() = user_id);

create policy "Users can update own signup"
  on public.signups for update
  using (auth.uid() = user_id);

create policy "Sport admins can manage all signups"
  on public.signups for all
  using (
    public.is_admin(auth.uid())
    or exists (
      select 1 from public.sessions s
      where s.id = session_id
      and public.is_sport_admin(auth.uid(), s.sport)
    )
  );

-- Signup capacity, waitlist promotion, and access-request side effects are implemented
-- in the Next.js server (lib/signup-capacity.ts and server actions).


-- 5. Team Access Requests ---------------------------------------------

create table public.team_access_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  sport       text not null,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz,
  unique(user_id, sport)
);

alter table public.team_access_requests enable row level security;

create policy "Users can read own request"
  on public.team_access_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own request"
  on public.team_access_requests for insert
  with check (auth.uid() = user_id);

create policy "Sport admins can read all requests"
  on public.team_access_requests for select
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can update requests"
  on public.team_access_requests for update
  using (public.is_sport_admin(auth.uid(), sport));
