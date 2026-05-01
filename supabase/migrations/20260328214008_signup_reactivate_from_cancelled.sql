-- When a user re-signs after cancelling, the row stays (unique session_id, user_id).
-- Recompute confirmed vs waitlisted using the same rules as new signups.

create or replace function public.handle_signup_reactivate_from_cancelled()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  cap integer;
  current_confirmed integer;
begin
  if old.status = 'cancelled' and new.status is distinct from 'cancelled' then
    select player_cap into cap
    from public.sessions
    where id = new.session_id
    for update;

    if cap is null then
      new.status := 'confirmed';
      return new;
    end if;

    select count(*) into current_confirmed
    from public.signups
    where session_id = new.session_id and status = 'confirmed';

    if current_confirmed >= cap then
      new.status := 'waitlisted';
    else
      new.status := 'confirmed';
    end if;
  end if;

  return new;
end;
$$;

create trigger on_signup_reactivate_from_cancelled
  before update on public.signups
  for each row
  execute function public.handle_signup_reactivate_from_cancelled();
