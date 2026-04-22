-- Expansion of Diary Entries for Pro Journaling
alter table diary_entries add column if not exists title text;
alter table diary_entries add column if not exists weather text;
alter table diary_entries add column if not exists tags text[] default '{}';
alter table diary_entries add column if not exists is_pinned boolean default false;
