-- Add sport column to team_access_requests
alter table public.team_access_requests add column sport text;

-- Backfill existing rows with 'softball'
update public.team_access_requests set sport = 'softball' where sport is null;

-- Now make it not null
alter table public.team_access_requests alter column sport set not null;

-- Drop the old unique constraint on user_id only
alter table public.team_access_requests drop constraint if exists team_access_requests_user_id_key;

-- Add new unique constraint on (user_id, sport)
alter table public.team_access_requests add constraint team_access_requests_user_id_sport_key unique (user_id, sport);

-- Update the trigger to write to sport_roles instead of profiles
create or replace function public.handle_access_request_update()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if new.status = 'approved' and old.status != 'approved' then
    insert into public.sport_roles (user_id, sport, is_team_member)
    values (new.user_id, new.sport, true)
    on conflict (user_id, sport)
    do update set is_team_member = true;
  end if;
  if new.status = 'rejected' and old.status = 'approved' then
    update public.sport_roles
    set is_team_member = false
    where user_id = new.user_id and sport = new.sport;
  end if;
  return new;
end;
$$;
