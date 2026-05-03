alter table public.sessions
  alter column signup_open set not null,
  alter column signup_close set not null;
