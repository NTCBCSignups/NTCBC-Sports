-- Auth is now mandatory for all sports — remove the toggle column.
-- Safety: set all existing rows to true before dropping, in case any downstream
-- system still reads the column during the migration window.
ALTER TABLE public.sport_configs DROP COLUMN auth_enabled;
