-- Manager RLS Policies for ReadingSpace
-- This script ensures managers can view and manage subscriptions and join requests for their rooms.

-- 1. Subscriptions: Allow managers to view subscriptions for THEIR rooms
DROP POLICY IF EXISTS "Managers can view subscriptions for their rooms" ON public.subscriptions;
CREATE POLICY "Managers can view subscriptions for their rooms" ON public.subscriptions
FOR SELECT USING (
  public.is_room_manager(room_id, auth.uid())
);

-- 2. Join Requests: Allow managers to view pending requests for THEIR rooms
DROP POLICY IF EXISTS "Managers can view join requests for their rooms" ON public.join_requests;
CREATE POLICY "Managers can view join requests for their rooms" ON public.join_requests
FOR SELECT USING (
  public.is_room_manager(room_id, auth.uid())
);

-- 3. Join Requests: Allow managers to update (Accept/Reject) requests for THEIR rooms
DROP POLICY IF EXISTS "Managers can update join requests for their rooms" ON public.join_requests;
CREATE POLICY "Managers can update join requests for their rooms" ON public.join_requests
FOR UPDATE USING (
  public.is_room_manager(room_id, auth.uid())
) WITH CHECK (
  public.is_room_manager(room_id, auth.uid())
);

-- 4. Subscriptions: Allow managers to insert (Activate) new subscriptions
DROP POLICY IF EXISTS "Managers can activate subscriptions" ON public.subscriptions;
CREATE POLICY "Managers can activate subscriptions" ON public.subscriptions
FOR INSERT WITH CHECK (
  public.is_room_manager(room_id, auth.uid())
);
