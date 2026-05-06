-- ── 7. Reminders ─────────────────────────────────────────────
create table if not exists reminders (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users on delete cascade,
  label         text not null,
  reminder_time time not null,
  reminder_date date, -- For one-time reminders
  repeat_days   int4[] default '{}', -- [0, 1, 2...] for Sun, Mon, Tue...
  is_enabled    boolean default true,
  created_at    timestamptz default now()
);

alter table reminders enable row level security;

create policy "reminders: own CRUD"
  on reminders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
