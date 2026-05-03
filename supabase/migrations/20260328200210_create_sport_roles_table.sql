-- 1. Create sport_roles table
create table public.sport_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  sport text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  is_team_member boolean not null default false,
  created_at timestamptz not null default now(),
  unique(user_id, sport)
);

create index sport_roles_user_sport_idx on public.sport_roles (user_id, sport);
create index sport_roles_sport_idx on public.sport_roles (sport);

alter table public.sport_roles enable row level security;

-- RLS for sport_roles
create policy "Users can read own sport roles"
  on public.sport_roles for select
  using (auth.uid() = user_id);

create policy "Global admins can read all sport roles"
  on public.sport_roles for select
  using (public.is_admin(auth.uid()));

create policy "Global admins can manage all sport roles"
  on public.sport_roles for all
  using (public.is_admin(auth.uid()));

-- 2. is_sport_admin: checks global admin OR sport-specific admin
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

-- 3. is_sport_team_member: checks global admin, sport admin, or sport team member
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

-- 4. Add sport-scoped admin RLS policy for sport_roles itself
create policy "Sport admins can read sport roles for their sport"
  on public.sport_roles for select
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can manage sport roles for their sport"
  on public.sport_roles for all
  using (public.is_sport_admin(auth.uid(), sport));
