-- Helper function that bypasses RLS to check admin status
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

-- Drop the recursive policies on profiles
drop policy if exists "Admins can read all profiles" on public.profiles;
drop policy if exists "Admins can update any profile" on public.profiles;

-- Recreate them using the helper function
create policy "Admins can read all profiles"
  on public.profiles for select
  using (public.is_admin(auth.uid()));

create policy "Admins can update any profile"
  on public.profiles for update
  using (public.is_admin(auth.uid()));
