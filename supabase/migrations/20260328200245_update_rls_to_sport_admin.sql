-- Sessions: update admin policies to use is_sport_admin
drop policy if exists "Admins can insert sessions" on public.sessions;
drop policy if exists "Admins can update sessions" on public.sessions;
drop policy if exists "Admins can delete sessions" on public.sessions;

create policy "Sport admins can insert sessions"
  on public.sessions for insert
  with check (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can update sessions"
  on public.sessions for update
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can delete sessions"
  on public.sessions for delete
  using (public.is_sport_admin(auth.uid(), sport));

-- Signups: update admin policy to check sport via sessions join
drop policy if exists "Admins can manage all signups" on public.signups;

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

-- Team access requests: update admin policies to use is_sport_admin
drop policy if exists "Admins can read all requests" on public.team_access_requests;
drop policy if exists "Admins can update requests" on public.team_access_requests;

create policy "Sport admins can read all requests"
  on public.team_access_requests for select
  using (public.is_sport_admin(auth.uid(), sport));

create policy "Sport admins can update requests"
  on public.team_access_requests for update
  using (public.is_sport_admin(auth.uid(), sport));
