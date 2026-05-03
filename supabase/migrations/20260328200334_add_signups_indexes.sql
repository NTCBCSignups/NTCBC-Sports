create index if not exists signups_session_id_idx on public.signups (session_id);
create index if not exists signups_session_status_idx on public.signups (session_id, status);
