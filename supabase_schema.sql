-- ReadingSpace Supabase Schema & RLS Policies

-- 1. Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  gender text,
  role text not null check (role in ('manager', 'student')),
  avatar_url text,
  business_name text,   -- manager only
  address text,         -- manager only
  created_at timestamptz default now()
);

-- 2. Rooms
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  tier text check (tier in ('premium', 'standard')) not null,
  total_seats int not null,
  description text,
  photo_url text,
  operating_hours jsonb,
  join_key text unique not null default substr(md5(random()::text), 1, 8),
  created_at timestamptz default now()
);

-- 3. Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade not null,
  seat_number text not null,
  tier text check (tier in ('premium', 'standard')) not null,
  start_date date not null,
  end_date date not null,
  status text default 'active' check (status in ('active', 'expired', 'pending')),
  is_offline boolean default false,
  invite_sent boolean default false,
  invite_accepted boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(student_id, room_id)
);

-- 4. Attendance Logs
create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  date date not null default current_date,
  marked_by text check (marked_by in ('self', 'manager')) not null,
  timestamp timestamptz default now(),
  unique(student_id, room_id, date)
);

-- 5. Join Requests
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requested_at timestamptz default now()
);
create unique index unique_pending_request
on public.join_requests (student_id, room_id)
where status = 'pending';

-- 6. Notes
create table public.notes (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade,
  title text not null,
  content text not null,
  tags text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ENABLE RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.join_requests enable row level security;
alter table public.notes enable row level security;

-- RLS POLICIES

-- Profiles: Users can read/update their own; managers can read students in their rooms
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- Rooms: Managers can CRUD their own; students can read rooms they have a subscription for
create policy "Managers can CRUD own rooms" on public.rooms for all using (auth.uid() = manager_id);
create policy "Students can view subscribed rooms" on public.rooms for select using (
  exists (
    select 1 from public.subscriptions 
    where subscriptions.room_id = rooms.id and subscriptions.student_id = auth.uid()
  )
);

-- Subscriptions: Managers can CRUD for their rooms; students can read their own
create policy "Managers can CRUD room subscriptions" on public.subscriptions for all using (
  exists (
    select 1 from public.rooms 
    where rooms.id = subscriptions.room_id and rooms.manager_id = auth.uid()
  )
);
create policy "Students can view own subscriptions" on public.subscriptions for select using (auth.uid() = student_id);

-- Attendance: Students insert own; managers insert/update for their rooms
create policy "Students can insert own attendance" on public.attendance_logs for insert with check (auth.uid() = student_id);
create policy "Users can view relevant attendance" on public.attendance_logs for select using (
  auth.uid() = student_id or 
  exists (
    select 1 from public.rooms 
    where rooms.id = attendance_logs.room_id and rooms.manager_id = auth.uid()
  )
);
create policy "Managers can manage room attendance" on public.attendance_logs for all using (
  exists (
    select 1 from public.rooms 
    where rooms.id = attendance_logs.room_id and rooms.manager_id = auth.uid()
  )
);

-- Join Requests: Students insert; managers read/update
create policy "Students can create join requests" on public.join_requests for insert with check (auth.uid() = student_id);
create policy "Students can view own join requests" on public.join_requests for select using (auth.uid() = student_id);
create policy "Managers can view room join requests" on public.join_requests for select using (
  exists (
    select 1 from public.rooms 
    where rooms.id = join_requests.room_id and rooms.manager_id = auth.uid()
  )
);
create policy "Managers can update room join requests" on public.join_requests for update using (
  exists (
    select 1 from public.rooms 
    where rooms.id = join_requests.room_id and rooms.manager_id = auth.uid()
  )
);

-- Notes: Students CRUD own
create policy "Students can manage own notes" on public.notes for all using (auth.uid() = student_id);

-- AUTOMATIC PROFILE CREATION on Auth Signup
-- This function will be triggered when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role)
  values (new.id, new.raw_user_meta_data->>'name', new.email, new.raw_user_meta_data->>'role');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
