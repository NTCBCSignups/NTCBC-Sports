-- Remove business-logic triggers if a database was created from an older 001 + 002.
-- Fresh installs from the current 001 no longer create these objects.

drop trigger if exists on_signup_reactivate_from_cancelled on public.signups;
drop trigger if exists on_signup_cancelled on public.signups;
drop trigger if exists on_signup_created on public.signups;
drop trigger if exists on_access_request_updated on public.team_access_requests;

drop function if exists public.handle_signup_reactivate_from_cancelled();
drop function if exists public.promote_from_waitlist();
drop function if exists public.handle_new_signup();
drop function if exists public.handle_access_request_update();

-- Replace restrictive profile read policies with a single open-to-authenticated one.
drop policy if exists "Users can read own profile" on public.profiles;
drop policy if exists "Admins can read all profiles" on public.profiles;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'profiles'
      and policyname = 'Authenticated users can read all profiles'
  ) then
    create policy "Authenticated users can read all profiles"
      on public.profiles for select
      using (auth.uid() is not null);
  end if;
end
$$;
