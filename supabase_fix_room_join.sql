-- Fix for Room Join RLS/Verification
-- 1. Create a secure RPC to verify join keys
CREATE OR REPLACE FUNCTION public.verify_room_key(p_key text)
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT r.id, r.name
  FROM public.rooms r
  WHERE r.join_key = p_key;
END;
$$;

-- 2. Ensure RLS policies allow the RPC to function correctly
ALTER FUNCTION public.verify_room_key(text) OWNER TO postgres;
GRANT EXECUTE ON FUNCTION public.verify_room_key(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_room_key(text) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_room_key(text) TO service_role;

-- 3. Update RLS for join_requests to allow students to see their own requests
DROP POLICY IF EXISTS "Students can view own join requests" ON public.join_requests;
CREATE POLICY "Students can view own join requests" ON public.join_requests FOR SELECT USING (auth.uid() = student_id);
