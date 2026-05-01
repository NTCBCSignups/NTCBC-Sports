-- Drop is_team_member from profiles (moved to sport_roles)
alter table public.profiles drop column if exists is_team_member;
