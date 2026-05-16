-- Security Hardening Migrations for ReadingSpace

-- 1. Revoke public/anon access from verify_room_key
REVOKE EXECUTE ON FUNCTION public.verify_room_key(text) FROM anon;

-- 2. Enable RLS on installments
ALTER TABLE public.installments ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view and modify installments for students in their rooms
DROP POLICY IF EXISTS "Managers can manage installments for their rooms" ON public.installments;
CREATE POLICY "Managers can manage installments for their rooms" ON public.installments
FOR ALL
USING (
  public.is_room_manager(room_id, auth.uid())
)
WITH CHECK (
  public.is_room_manager(room_id, auth.uid())
);

-- Policy: Students can view their own installments
DROP POLICY IF EXISTS "Students can view their own installments" ON public.installments;
CREATE POLICY "Students can view their own installments" ON public.installments
FOR SELECT
USING (
  student_id = auth.uid()
);

-- 3. Enable RLS on attendance_sessions
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Managers can view and modify sessions for students in their rooms
DROP POLICY IF EXISTS "Managers can manage sessions for their rooms" ON public.attendance_sessions;
CREATE POLICY "Managers can manage sessions for their rooms" ON public.attendance_sessions
FOR ALL
USING (
  public.is_room_manager(room_id, auth.uid())
)
WITH CHECK (
  public.is_room_manager(room_id, auth.uid())
);

-- Policy: Students can view their own sessions
DROP POLICY IF EXISTS "Students can view their own sessions" ON public.attendance_sessions;
CREATE POLICY "Students can view their own sessions" ON public.attendance_sessions
FOR SELECT
USING (
  student_id = auth.uid()
);
