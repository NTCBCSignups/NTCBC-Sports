-- sessions: replace 3 admin policies
drop policy if exists "Admins can insert sessions" on public.sessions;
drop policy if exists "Admins can update sessions" on public.sessions;
drop policy if exists "Admins can delete sessions" on public.sessions;

create policy "Admins can insert sessions"
  on public.sessions for insert
  with check (public.is_admin(auth.uid()));

create policy "Admins can update sessions"
  on public.sessions for update
  using (public.is_admin(auth.uid()));

create policy "Admins can delete sessions"
  on public.sessions for delete
  using (public.is_admin(auth.uid()));

-- signups: replace admin policy
drop policy if exists "Admins can manage all signups" on public.signups;

create policy "Admins can manage all signups"
  on public.signups for all
  using (public.is_admin(auth.uid()));

-- team_access_requests: replace 2 admin policies
drop policy if exists "Admins can read all requests" on public.team_access_requests;
drop policy if exists "Admins can update requests" on public.team_access_requests;

create policy "Admins can read all requests"
  on public.team_access_requests for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update requests"
  on public.team_access_requests for update
  using (public.is_admin(auth.uid()));
