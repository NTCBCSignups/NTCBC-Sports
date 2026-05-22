-- Flexible JSON column for alternate session views (e.g. batting order).
-- Each key is a view ID, value is view-specific data.
-- Example: { "battingOrder": ["user_id_1", "user_id_2", ...] }
alter table sessions
  add column alt_session_views jsonb not null default '{}';
