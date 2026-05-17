-- ============================================================
-- ReadingSpace: Check-In / Check-Out Sessions
-- Run in Supabase SQL Editor
-- ============================================================

-- 1. Create attendance_sessions table
CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_id       uuid REFERENCES public.rooms(id)    ON DELETE CASCADE NOT NULL,
  date          date NOT NULL DEFAULT current_date,
  check_in_at   timestamptz NOT NULL DEFAULT now(),
  check_out_at  timestamptz,   -- NULL = currently inside
  marked_by     text CHECK (marked_by IN ('self','manager')) NOT NULL DEFAULT 'manager',
  is_auto_checkout boolean DEFAULT false, -- true if system auto-closed at day end
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sessions_student   ON public.attendance_sessions(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_room_date ON public.attendance_sessions(room_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_open      ON public.attendance_sessions(room_id, date) WHERE check_out_at IS NULL;

-- 2. RLS
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can manage own sessions"
  ON public.attendance_sessions FOR ALL
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Managers can manage room sessions"
  ON public.attendance_sessions FOR ALL
  USING (public.is_room_manager(room_id, auth.uid()));

GRANT ALL ON public.attendance_sessions TO service_role;

-- 3. Backfill from existing attendance_logs
--    Existing check-ins: use 09:00 IST as default check-in time.
--    Past dates: auto checkout at 23:59:59 IST.
--    Today's: left open (check_out_at = NULL).
INSERT INTO public.attendance_sessions
  (student_id, room_id, date, check_in_at, check_out_at, marked_by, is_auto_checkout)
SELECT
  al.student_id,
  al.room_id,
  al.date,
  -- Use actual timestamp if stored, else default to 9 AM IST
  COALESCE(al.timestamp, (al.date::text || 'T09:00:00+05:30')::timestamptz) AS check_in_at,
  -- Auto-close past days at end of day IST
  CASE
    WHEN al.date < current_date
    THEN (al.date::text || 'T23:59:59+05:30')::timestamptz
    ELSE NULL
  END AS check_out_at,
  al.marked_by,
  -- Mark as auto-checkout for past days
  CASE WHEN al.date < current_date THEN true ELSE false END AS is_auto_checkout
FROM public.attendance_logs al
ON CONFLICT DO NOTHING;
