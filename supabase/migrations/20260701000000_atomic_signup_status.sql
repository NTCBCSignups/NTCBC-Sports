-- Atomic signup status resolution to prevent race conditions (TOCTOU).
-- Returns 'confirmed' or 'waitlisted' based on current confirmed count vs player_cap.
-- Uses FOR UPDATE on the session row to serialize concurrent signups.

create or replace function public.resolve_signup_status(p_session_id uuid)
returns text
language plpgsql
as $$
declare
  v_player_cap integer;
  v_confirmed_count integer;
begin
  -- Lock the session row to serialize concurrent signup attempts
  select player_cap into v_player_cap
  from public.sessions
  where id = p_session_id
  for update;

  if not found then
    raise exception 'Session not found: %', p_session_id;
  end if;

  -- No cap means always confirmed
  if v_player_cap is null then
    return 'confirmed';
  end if;

  select count(*) into v_confirmed_count
  from public.signups
  where session_id = p_session_id and status = 'confirmed';

  if v_confirmed_count >= v_player_cap then
    return 'waitlisted';
  else
    return 'confirmed';
  end if;
end;
$$;
