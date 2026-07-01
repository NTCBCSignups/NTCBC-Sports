-- Atomic signup to prevent race conditions.
-- Uses an advisory lock to serialize signups per session, then checks capacity
-- and inserts/updates in a single transaction.

create or replace function public.atomic_signup(
  p_session_id uuid,
  p_user_id uuid,
  p_existing_signup_id uuid default null
)
returns text
language plpgsql
as $$
declare
  v_player_cap integer;
  v_confirmed_count integer;
  v_status text;
begin
  -- Serialize signups for this session (released automatically on commit)
  perform pg_advisory_xact_lock(hashtext(p_session_id::text));

  select player_cap into v_player_cap
  from public.sessions where id = p_session_id;

  if not found then
    raise exception 'Session not found: %', p_session_id;
  end if;

  if v_player_cap is null then
    v_status := 'confirmed';
  else
    select count(*) into v_confirmed_count
    from public.signups
    where session_id = p_session_id and status = 'confirmed';

    v_status := case when v_confirmed_count >= v_player_cap then 'waitlisted' else 'confirmed' end;
  end if;

  if p_existing_signup_id is not null then
    update public.signups set status = v_status, created_at = now() where id = p_existing_signup_id;
  else
    insert into public.signups (session_id, user_id, status) values (p_session_id, p_user_id, v_status);
  end if;

  return v_status;
end;
$$;
