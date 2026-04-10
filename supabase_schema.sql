-- ReadingSpace Consolidated Master Schema
-- This file contains the complete database structure, functions, triggers, and RLS policies.

-- ==========================================
-- 1. TABLES
-- ==========================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  phone text,
  gender text,
  bio text,
  role text not null check (role in ('manager', 'student')),
  avatar_url text,
  business_name text,   -- manager only
  address text,         -- manager only
  membership_type text default 'digital' check (membership_type in ('digital', 'managed')),
  created_at timestamptz default now()
);

-- Rooms
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
  latitude float8,
  longitude float8,
  radius float8 default 200.0,
  created_at timestamptz default now()
);

-- Subscriptions
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade not null,
  seat_number text not null,
  tier text check (tier in ('premium', 'standard')) not null,
  start_date date not null,
  end_date date not null,
  status text default 'active' check (status in ('active', 'expired', 'pending')),
  membership_type text default 'digital' check (membership_type in ('digital', 'managed')),
  is_offline boolean default false,
  invite_sent boolean default false,
  invite_accepted boolean default false,
  notes text,
  created_at timestamptz default now(),
  unique(student_id, room_id)
);

-- Attendance Logs
create table public.attendance_logs (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  date date not null default current_date,
  marked_by text check (marked_by in ('self', 'manager')) not null,
  timestamp timestamptz default now(),
  unique(student_id, room_id, date)
);

-- Join Requests
create table public.join_requests (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references public.profiles(id) on delete cascade not null,
  room_id uuid references public.rooms(id) on delete cascade not null,
  status text default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  requested_at timestamptz default now()
);

-- Notes
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

-- ==========================================
-- 2. INDEXES
-- ==========================================

create unique index unique_pending_request
on public.join_requests (student_id, room_id)
where status = 'pending';

create index idx_profiles_role on public.profiles(role);
create index idx_rooms_manager on public.rooms(manager_id);
create index idx_subscriptions_student on public.subscriptions(student_id);
create index idx_subscriptions_status on public.subscriptions(status);

-- ==========================================
-- 3. FUNCTIONS (Security Definer)
-- ==========================================

-- Check if user is manager of a specific room
create or replace function public.is_room_manager(room_uuid uuid, user_uuid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.rooms
    where id = room_uuid and manager_id = user_uuid
  );
$$;

-- Check if user is an active student in a room
create or replace function public.is_room_student(room_uuid uuid, user_uuid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions
    where room_id = room_uuid and student_id = user_uuid and status = 'active'
  );
$$;

-- Check if manager manages a specific student
create or replace function public.is_manager_of_student(student_uuid uuid, manager_uuid uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.subscriptions s
    join public.rooms r on s.room_id = r.id
    where s.student_id = student_uuid and r.manager_id = manager_uuid
  );
$$;

-- Securely verify room join keys (RPC)
create or replace function public.verify_room_key(p_key text)
returns table(id uuid, name text) language plpgsql security definer set search_path = public as $$
begin
  return query select r.id, r.name from public.rooms r where r.join_key = p_key;
end; $$;

-- ==========================================
-- 4. RLS POLICIES
-- ==========================================

alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.subscriptions enable row level security;
alter table public.attendance_logs enable row level security;
alter table public.join_requests enable row level security;
alter table public.notes enable row level security;

-- Profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Managers can view students in their rooms" on public.profiles for select using (
  public.is_manager_of_student(id, auth.uid())
);

-- Rooms
create policy "Managers can CRUD own rooms" on public.rooms for all using (auth.uid() = manager_id);
create policy "Students can view subscribed rooms" on public.rooms for select using (
  public.is_room_student(id, auth.uid())
);

-- Subscriptions
create policy "Managers can CRUD room subscriptions" on public.subscriptions for all using (
  public.is_room_manager(room_id, auth.uid())
);
create policy "Students can view own subscriptions" on public.subscriptions for select using (auth.uid() = student_id);

-- Attendance
create policy "Students can insert own attendance" on public.attendance_logs for insert with check (auth.uid() = student_id);
create policy "Users can view relevant attendance" on public.attendance_logs for select using (
  auth.uid() = student_id or public.is_room_manager(room_id, auth.uid())
);
create policy "Managers can manage room attendance" on public.attendance_logs for all using (
  public.is_room_manager(room_id, auth.uid())
);

-- Join Requests
create policy "Students can manage own join requests" on public.join_requests for all using (auth.uid() = student_id);
create policy "Managers can manage room join requests" on public.join_requests for all using (
  public.is_room_manager(room_id, auth.uid())
);

-- Notes
create policy "Students can manage own notes" on public.notes for all using (auth.uid() = student_id);

-- ==========================================
-- 5. TRIGGERS
-- ==========================================

-- Profile generation on Auth Signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email, role, phone, business_name, address)
  values (
    new.id, 
    new.raw_user_meta_data->>'name', 
    new.email, 
    new.raw_user_meta_data->>'role',
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'business_name',
    new.raw_user_meta_data->>'address'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- 6. PERMISSIONS
-- ==========================================

grant execute on function public.verify_room_key(text) to authenticated, anon;
