-- Add facilitator_id column to sessions table
ALTER TABLE public.sessions
  ADD COLUMN facilitator_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Update sessions_update RLS policy to also allow facilitators to update their session
DROP POLICY IF EXISTS "sessions_update" ON public.sessions;
CREATE POLICY "sessions_update"
  ON public.sessions FOR UPDATE
  USING (
    public.is_sport_admin(auth.uid(), sport)
    OR auth.uid() = facilitator_id
  );
