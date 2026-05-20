-- Make session status flexible for future values and add status_notes
alter table sessions
  drop constraint sessions_status_check;

-- Re-add a looser constraint (just non-empty text)
alter table sessions
  add constraint sessions_status_check check (status <> '');

-- Optional notes explaining the status change (e.g. cancellation reason)
alter table sessions
  add column status_notes text;
