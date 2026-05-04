-- 1. Profiles (extends auth.users)

create table public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  role        text not null default 'user' check (role in ('user', 'admin')),
  is_team_member boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can read own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Admins can read all profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "Admins can update any profile"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

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


-- 2. Sessions

create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  sport           text not null,
  session_type    text not null,
  title           text,
  date            date not null,
  time_start      time not null,
  time_end        time not null,
  location_name   text not null,
  location_address text not null,
  location_maps_link text,
  player_cap      integer not null,
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

create policy "Admins can insert sessions"
  on public.sessions for insert
  with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update sessions"
  on public.sessions for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can delete sessions"
  on public.sessions for delete
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );


-- 3. Signups

create table public.signups (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  status      text not null default 'confirmed' check (status in ('confirmed', 'waitlisted', 'cancelled')),
  created_at  timestamptz not null default now(),
  unique(session_id, user_id)
);

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

create policy "Admins can manage all signups"
  on public.signups for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.handle_new_signup()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  cap integer;
  current_confirmed integer;
begin
  select player_cap into cap
  from public.sessions
  where id = new.session_id;

  select count(*) into current_confirmed
  from public.signups
  where session_id = new.session_id and status = 'confirmed';

  if current_confirmed >= cap then
    new.status := 'waitlisted';
  else
    new.status := 'confirmed';
  end if;

  return new;
end;
$$;

create trigger on_signup_created
  before insert on public.signups
  for each row execute function public.handle_new_signup();

create or replace function public.promote_from_waitlist()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  cap integer;
  current_confirmed integer;
  next_waitlisted uuid;
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    select player_cap into cap
    from public.sessions
    where id = new.session_id;

    select count(*) into current_confirmed
    from public.signups
    where session_id = new.session_id and status = 'confirmed';

    if current_confirmed < cap then
      select id into next_waitlisted
      from public.signups
      where session_id = new.session_id and status = 'waitlisted'
      order by created_at asc
      limit 1;

      if next_waitlisted is not null then
        update public.signups
        set status = 'confirmed'
        where id = next_waitlisted;
      end if;
    end if;
  end if;

  return new;
end;
$$;

create trigger on_signup_cancelled
  after update on public.signups
  for each row execute function public.promote_from_waitlist();


-- 4. Team Access Requests

create table public.team_access_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade unique,
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by uuid references public.profiles(id),
  created_at  timestamptz not null default now(),
  reviewed_at timestamptz
);

alter table public.team_access_requests enable row level security;

create policy "Users can read own request"
  on public.team_access_requests for select
  using (auth.uid() = user_id);

create policy "Users can insert own request"
  on public.team_access_requests for insert
  with check (auth.uid() = user_id);

create policy "Admins can read all requests"
  on public.team_access_requests for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "Admins can update requests"
  on public.team_access_requests for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create or replace function public.handle_access_request_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    update public.profiles
    set is_team_member = true, updated_at = now()
    where id = new.user_id;
  end if;
  if new.status = 'rejected' and old.status = 'approved' then
    update public.profiles
    set is_team_member = false, updated_at = now()
    where id = new.user_id;
  end if;
  return new;
end;
$$;

create trigger on_access_request_updated
  after update on public.team_access_requests
  for each row execute function public.handle_access_request_update();
