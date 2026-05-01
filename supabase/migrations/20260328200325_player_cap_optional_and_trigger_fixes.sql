-- Make player_cap nullable
alter table public.sessions alter column player_cap drop not null;

-- Update handle_new_signup to handle null cap and add row locking
create or replace function public.handle_new_signup()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  cap integer;
  current_confirmed integer;
begin
  -- Lock the session row to prevent race conditions
  select player_cap into cap
  from public.sessions
  where id = new.session_id
  for update;

  -- No cap means unlimited, always confirm
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

  return new;
end;
$$;

-- Update promote_from_waitlist to handle null cap
create or replace function public.promote_from_waitlist()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  cap integer;
  current_confirmed integer;
  next_waitlisted uuid;
begin
  if old.status = 'confirmed' and new.status = 'cancelled' then
    select player_cap into cap
    from public.sessions
    where id = new.session_id;

    -- No cap means always promote
    if cap is null then
      select id into next_waitlisted
      from public.signups
      where session_id = new.session_id and status = 'waitlisted'
      order by created_at asc
      limit 1;

      if next_waitlisted is not null then
        update public.signups
        set status = 'confirmed'
        where id = next_waitlisted;
      end if;
      return new;
    end if;

    select count(*) into current_confirmed
    from public.signups
    where session_id = new.session_id and status = 'confirmed';

    if current_confirmed < cap then
      select id into next_waitlisted
      from public.signups
      where session_id = new.session_id and status = 'waitlisted'
      order by created_at asc
      limit 1;

      if next_waitlisted is not null then
        update public.signups
        set status = 'confirmed'
        where id = next_waitlisted;
      end if;
    end if;
  end if;

  return new;
end;
$$;
