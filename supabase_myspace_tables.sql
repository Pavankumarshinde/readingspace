-- ============================================================
-- My Space Tables — ReadingSpace Student Hub
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ── 1. Tasks ─────────────────────────────────────────────────
create table if not exists tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  title       text not null,
  done        boolean default false,
  priority    text default 'medium' check (priority in ('high', 'medium', 'low')),
  category    text default 'Study'  check (category in ('Study', 'Personal', 'Health', 'Other')),
  due_date    date,
  created_at  timestamptz default now()
);

alter table tasks enable row level security;

create policy "tasks: own CRUD"
  on tasks for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 2. Calendar Events ───────────────────────────────────────
create table if not exists calendar_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  title       text not null,
  event_date  date not null,
  event_time  time,
  color       text default '#8B3A0F',
  created_at  timestamptz default now()
);

alter table calendar_events enable row level security;

create policy "calendar_events: own CRUD"
  on calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 3. Focus Sessions ────────────────────────────────────────
create table if not exists focus_sessions (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users on delete cascade,
  task_name        text,
  duration_minutes int,
  mode             text check (mode in ('pomodoro', 'short', 'long')),
  completed_at     timestamptz default now()
);

alter table focus_sessions enable row level security;

create policy "focus_sessions: own CRUD"
  on focus_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 4. Diary Entries ─────────────────────────────────────────
create table if not exists diary_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  content     text,
  mood        text,
  word_count  int default 0,
  entry_date  date default current_date,
  created_at  timestamptz default now()
);

alter table diary_entries enable row level security;

create policy "diary_entries: own CRUD"
  on diary_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 5. Habits ────────────────────────────────────────────────
create table if not exists habits (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users on delete cascade,
  name        text not null,
  icon        text default '⭐',
  created_at  timestamptz default now()
);

alter table habits enable row level security;

create policy "habits: own CRUD"
  on habits for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 6. Habit Logs ────────────────────────────────────────────
create table if not exists habit_logs (
  id        uuid primary key default gen_random_uuid(),
  habit_id  uuid references habits(id) on delete cascade,
  user_id   uuid references auth.users on delete cascade,
  log_date  date default current_date,
  unique (habit_id, log_date)
);

alter table habit_logs enable row level security;

create policy "habit_logs: own CRUD"
  on habit_logs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================
-- Done! All 6 tables created with RLS enabled.
-- ============================================================
