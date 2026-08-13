-- Prevent deleting or demoting the last admin for a sport (closes TOCTOU race).
create or replace function public.check_last_admin()
returns trigger as $$
begin
  if old.role = 'admin' and (
    -- DELETE, or UPDATE that demotes from admin
    tg_op = 'DELETE' or new.role <> 'admin'
  ) then
    if not exists (
      select 1 from public.sport_roles
      where sport = old.sport
        and role = 'admin'
        and user_id <> old.user_id
    ) then
      raise exception 'Cannot remove the last admin for sport "%"', old.sport;
    end if;
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_check_last_admin
  before delete or update on public.sport_roles
  for each row
  execute function public.check_last_admin();
