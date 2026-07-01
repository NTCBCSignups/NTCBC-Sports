-- Members tab: Simplify team_access_requests lifecycle.
-- Approved requests are now deleted (sport_role is authoritative).
-- Rejected requests persist until user acknowledges or re-requests.
-- This migration:
-- 1. Drops the DB trigger (approval/rejection handled in app code)
-- 2. Adds DELETE policies for users (own rejected) and sport admins

-- 1. Drop the trigger and function (now handled in server actions)
drop trigger if exists on_access_request_updated on public.team_access_requests;
drop function if exists public.handle_access_request_update();

-- 2. Add DELETE policy: users can delete their own rejected requests (acknowledge)
create policy "Users can delete own rejected request"
  on public.team_access_requests for delete
  using (auth.uid() = user_id and status = 'rejected');

-- 3. Add DELETE policy: sport admins can delete requests (on approval)
create policy "Sport admins can delete requests"
  on public.team_access_requests for delete
  using (public.is_sport_admin(auth.uid(), sport));
