-- Allow any authenticated user to read sport_roles.
-- This enables non-team-members to see team member badges in attendance lists.
-- The previous policy restricted reads to own row / admin / team member only,
-- which caused getTeamMembers() to return empty for regular users.

drop policy if exists "sport_roles_read" on public.sport_roles;

create policy "sport_roles_read"
  on public.sport_roles for select
  using (auth.uid() is not null);
