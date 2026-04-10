-- FINAL FIX: Student Phone Number Visibility & Persistence
-- Run this in your Supabase SQL Editor

-- 1. Create a specialized helper to check manager-student linkage
-- This is used for RLS to protect student privacy while allowing management
CREATE OR REPLACE FUNCTION public.is_manager_of_student(student_uuid uuid, manager_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.rooms r ON s.room_id = r.id
    WHERE s.student_id = student_uuid AND r.manager_id = manager_uuid
  );
$$;

-- 2. Update RLS Policy for 'profiles'
-- This allows managers to view the Contact Details (Name, Email, Phone) of students in their rooms
DROP POLICY IF EXISTS "Managers can view student profiles" ON public.profiles;
CREATE POLICY "Managers can view student profiles" ON public.profiles
FOR SELECT USING (
  (auth.uid() = id) OR -- User can see themselves
  public.is_manager_of_student(id, auth.uid()) -- Manager can see their students
);

-- 3. Optimization: Ensure phone numbers are correctly indexed if needed
-- CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 4. Manual Sync (Optional): Run this to fix existing students who might have missing numbers
-- If you have a specific student's ID and phone, you can run:
-- UPDATE public.profiles SET phone = 'STUDENT_PHONE' WHERE id = 'STUDENT_ID';

-- 5. Final verification: Check if you can now see the phone numbers in the Manager Dashboard.
