-- Add status column to sessions table
-- Possible values: 'active', 'cancelled'
alter table sessions
  add column status text not null default 'active'
  constraint sessions_status_check check (status in ('active', 'cancelled'));

-- Index for filtering by status
create index idx_sessions_status on sessions (status);
