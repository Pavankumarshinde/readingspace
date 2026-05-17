-- ==========================================
-- Focus Sessions Backend - ReadingSpace
-- ==========================================

-- 1. Table Structure
create table if not exists focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade,
  task_name        text,
  duration_minutes int not null,
  mode             text check (mode in ('pomodoro', 'short', 'long')),
  completed_at     timestamptz default now()
);

-- 2. Security
alter table focus_sessions enable row level security;

-- Drop existing if needed to avoid conflicts
drop policy if exists "focus_sessions: own CRUD" on focus_sessions;

create policy "focus_sessions: own CRUD"
  on focus_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 3. Performance Indexes
create index if not exists idx_focus_sessions_user_id on focus_sessions(user_id);
create index if not exists idx_focus_sessions_completed_at on focus_sessions(completed_at);

-- 4. Helpful View for Analytics (Optional but useful for habits/focus correlation)
create or replace view daily_focus_summary as
select 
  user_id,
  completed_at::date as focus_date,
  sum(duration_minutes) as total_minutes,
  count(*) as session_count
from focus_sessions
group by user_id, focus_date;
