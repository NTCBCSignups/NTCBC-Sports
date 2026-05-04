-- Add "declined" signup status for users who indicate they cannot attend
ALTER TABLE public.signups DROP CONSTRAINT signups_status_check;
ALTER TABLE public.signups ADD CONSTRAINT signups_status_check
  CHECK (status IN ('confirmed', 'waitlisted', 'cancelled', 'declined'));
