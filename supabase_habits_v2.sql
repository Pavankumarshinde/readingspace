-- ============================================================
-- Habit Tracker Pro V2 — Migration
-- Run this in your Supabase SQL Editor
-- ============================================================

-- Upgrade Habits Table
alter table habits add column if not exists is_archived boolean default false;
alter table habits add column if not exists habit_type text default 'checklist' check (habit_type in ('checklist', 'numeric'));
alter table habits add column if not exists target_value numeric default 1;
alter table habits add column if not exists unit text default 'times';
alter table habits add column if not exists frequency_type text default 'daily' check (frequency_type in ('daily', 'specific_days'));
alter table habits add column if not exists frequency_days int[] default '{}';
alter table habits add column if not exists color text default '#9B4000';

-- Upgrade Habit Logs Table
alter table habit_logs add column if not exists value numeric default 1;
alter table habit_logs add column if not exists note text;

-- Optional: Re-run RLS policies if needed, 
-- but they already cover 'all' for auth.uid() = user_id.
