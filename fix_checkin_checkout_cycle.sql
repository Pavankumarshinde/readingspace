-- ============================================================
-- ReadingSpace: Check-In / Check-Out Cycle Fix + Auto-Checkout
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. Ensure attendance_sessions table has is_auto_checkout column
-- (Skip if it already exists)
ALTER TABLE public.attendance_sessions
  ADD COLUMN IF NOT EXISTS is_auto_checkout BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Ensure the table allows multiple sessions per student per day
-- (Remove any unique constraint that prevents this)
-- Check existing constraints:
-- SELECT conname FROM pg_constraint WHERE conrelid = 'attendance_sessions'::regclass;
-- If you see a unique constraint on (student_id, room_id, date), drop it:
DO $$
BEGIN
  -- Drop unique constraint on (student_id, room_id, date) if it exists
  -- (prevents multiple check-ins per day)
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'attendance_sessions'::regclass 
    AND contype = 'u'
    AND conname LIKE '%student_id%room_id%date%'
  ) THEN
    -- Find and drop the constraint by name
    EXECUTE (
      SELECT 'ALTER TABLE public.attendance_sessions DROP CONSTRAINT ' || conname
      FROM pg_constraint 
      WHERE conrelid = 'attendance_sessions'::regclass 
      AND contype = 'u'
      LIMIT 1
    );
    RAISE NOTICE 'Dropped unique constraint to allow multiple sessions per day';
  ELSE
    RAISE NOTICE 'No blocking unique constraint found — multiple sessions per day already supported';
  END IF;
END $$;

-- 3. Verify/add a non-unique index for performance (student+room+date lookups)
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_student_room_date
  ON public.attendance_sessions (student_id, room_id, date);

-- 4. Index for open sessions (finding unclosed check-ins efficiently)
CREATE INDEX IF NOT EXISTS idx_attendance_sessions_open
  ON public.attendance_sessions (student_id, room_id, date)
  WHERE check_out_at IS NULL;

-- 5. Auto-close any existing forgotten open sessions from previous days
-- (Back-fill: close all open sessions older than today)
UPDATE public.attendance_sessions
SET 
  check_out_at = (date || 'T23:59:59+05:30')::timestamptz,
  is_auto_checkout = TRUE
WHERE 
  check_out_at IS NULL
  AND date < CURRENT_DATE AT TIME ZONE 'Asia/Kolkata';

-- Show how many were auto-closed
DO $$
DECLARE
  v_count INT;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Auto-closed % forgotten open session(s) from previous days', v_count;
END $$;

-- 6. Enable Realtime for attendance_sessions table (required for live UI updates)
-- In Supabase Dashboard: Database > Replication > attendance_sessions (toggle ON)
-- OR run this:
ALTER TABLE public.attendance_sessions REPLICA IDENTITY FULL;

-- Verify Realtime publications include attendance_sessions
-- Run: SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- If attendance_sessions is not listed, add it:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_sessions;

-- 7. Summary query: Check current open sessions
SELECT 
  s.id,
  p.name AS student_name,
  r.name AS room_name,
  s.date,
  s.check_in_at,
  s.check_out_at,
  s.is_auto_checkout
FROM public.attendance_sessions s
LEFT JOIN public.profiles p ON s.student_id = p.id
LEFT JOIN public.rooms r ON s.room_id = r.id
WHERE s.check_out_at IS NULL
ORDER BY s.check_in_at DESC
LIMIT 20;
