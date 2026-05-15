-- Enable RLS
alter table public.attendance_sessions enable row level security;

-- Student Policy: Can read own sessions
create policy "Students can view own sessions"
on public.attendance_sessions for select
using (auth.uid() = student_id);

-- Manager Policy: Can read sessions for their rooms
create policy "Managers can view room sessions"
on public.attendance_sessions for select
using (public.is_room_manager(room_id, auth.uid()));

-- Students can insert/update their own sessions
create policy "Students can manage own sessions"
on public.attendance_sessions for all
using (auth.uid() = student_id);

-- Managers can manage sessions in their rooms
create policy "Managers can manage room sessions"
on public.attendance_sessions for all
using (public.is_room_manager(room_id, auth.uid()));
