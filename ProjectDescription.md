# ReadingSpace — Project Report

## Overview

**ReadingSpace** is a SaaS platform for managing physical reading/study rooms. It serves two user roles — **Managers** (room operators) and **Students** (subscribers) — with QR-based attendance, geofencing, gamification, and subscription tracking.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16.2.1 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) with RLS |
| Auth | Supabase Auth (`@supabase/ssr`) |
| Email | Resend |
| QR Scan | `@zxing/library`, `html5-qrcode` |
| QR Generate | `qrcode.react` |
| Icons | `lucide-react` |
| Dates | `date-fns` |
| Toasts | `react-hot-toast` |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, Signup
│   ├── (manager)/       # Manager frontend
│   ├── (student)/       # Student frontend
│   ├── api/             # Backend API routes
│   ├── layout.tsx       # Root layout
│   └── page.tsx         # Auth router (redirects by role)
├── components/
│   ├── ui/              # Sidebar, BottomNav, Modal, Avatar
│   ├── manager/         # AttendanceScanner, QRDisplay
│   ├── student/         # JoinRoomModal, QRScanner, StudentHeader
│   └── emails/          # InviteEmail (React Email template)
├── lib/
│   ├── supabase/        # client.ts, server.ts (admin + user clients)
│   └── utils/           # distance.ts (Haversine), utils.ts (helpers)
├── types/               # index.ts (all interfaces), supabase.ts
└── hooks/               # useRealtimeAttendance.ts
```

---

## Manager Frontend

### Pages & Features

#### `/manager/dashboard`
- Executive overview with **Day / Week / Month** timeframe toggle
- **Room filter** dropdown
- **Attendance calendar heatmap** with dot markers per day
- **Occupancy metrics** — active students vs. room capacity
- **Expiring subscriptions** list with search
- **Top members** ranking (most frequent attendees)
- **Full activity feed** table with all check-ins and timestamps
- Month navigation to view historical data

#### `/manager/rooms`
- Room cards with occupancy, join key, geofence radius display
- **Add/Edit room** modal:
  - Name, description, capacity, tier (premium/standard)
  - Geofence setup: GPS coordinates + radius slider (10m–500m)
  - "Locate" button for live GPS capture
- **Delete** room with confirmation
- **Regenerate join key** (existing members unaffected)
- **QR Display** modal for room identification
- **Attendance scanner** overlay (manager scans student QR)

#### `/manager/students`
- Three-tab view: **Active**, **Expired**, **Join Requests**
- Search by name/email; filter by room
- Student cards: name, email, phone, seat, membership type, validity dates, status badges
- **Edit modal** — update seat, dates, tier, membership type, status
- **Delete** student (removes subscription)
- **Approve join requests** — assign seat and subscription dates
- **Print student QR pass** for physical verification

#### `/manager/students/add`
- Membership type toggle: **Digital** (login access) vs. **Managed** (offline record)
- Form: name, email, phone, room, seat, duration (months)
- **Send invite toggle** (digital members) — emails enrollment link via Resend
- Auto-calculates end date from months

#### `/manager/profile`
- Display/edit business name, address, email, phone
- **Phone OTP verification** flow
- Send query/feedback button
- Cache clear utility

---

## Student Frontend

### Pages & Features

#### `/student` (Home)
- Welcome greeting with first name
- **Active subscription card** — room name, seat, expiry
- Resume Learning button
- **Recent notes preview** (3 most recent)
- Study analytics: consistency score, focus level, session/notes counts

#### `/student/rooms`
- Search by room name
- **Join Room** button → JoinRoomModal (enter 8-char key)
- Room cards: name, location, expiry date, seat number, active status
- Enter button → room detail page

#### `/student/rooms/[roomId]`
- **Manual QR check-in** — full-screen QR scanner
- **My Access QR** — show personal QR for manager verification
- Seat and membership validity info
- **Gamification**: current streak, best streak (consecutive days attended)
- **Attendance calendar** — day cells marked when attended, month navigation
- Expiry warning banner if <7 days remaining
- Geolocation checked before scanner opens

#### `/student/notes`
- Search notes by title or content
- Note cards: title, 3-line preview, date, tags, pin indicator
- **Editor modal**: title, rich textarea, tag input (Enter/comma), pin toggle
- Sorted: pinned first, then by date descending
- Full CRUD (create, update, delete, pin)

#### `/student/profile`
- Display/edit name, email, phone
- **Phone OTP verification**
- Send query/feedback, cache clear

---

## Backend API Routes

### Manager APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/manager/students/add` | POST | Create student profile + subscription, send invite email |
| `/api/manager/students/update` | POST | Update subscription (seat, dates, type, status) |
| `/api/manager/students/delete` | POST | Delete subscription record |
| `/api/manager/students/payment-status` | POST | Fetch payment status |
| `/api/manager/rooms/add` | POST | Create room with geofence, auto-generate join key |
| `/api/manager/rooms/update` | POST | Update room config |
| `/api/manager/rooms/delete` | POST | Delete room + cascade |
| `/api/manager/rooms/regenerate-key` | POST | Generate new join key |
| `/api/manager/attendance/scan` | POST | Record attendance when manager scans student QR |
| `/api/manager/profile/request-otp` | POST | Send OTP to phone |
| `/api/manager/profile/verify-otp` | POST | Validate OTP, update phone |
| `/api/manager/profile/update` | POST | Update profile fields |

### Student APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/student/attendance/check-in` | POST | Self check-in with geofence validation |
| `/api/student/profile/request-otp` | POST | Phone OTP request |
| `/api/student/profile/verify-otp` | POST | Validate OTP, update phone |
| `/api/student/profile/update` | POST | Update profile fields |
| `/api/student/send-query` | POST | Send support query/feedback |

### Shared APIs

| Route | Method | Purpose |
|---|---|---|
| `/api/send-invite` | POST | Send enrollment invitation via Resend |
| `/api/debug-students` | GET | Debug endpoint (dev/testing) |

---

## Database Schema (Supabase PostgreSQL)

### Tables

**`profiles`** — User accounts
- `id` (UUID, FK → auth.users), `name`, `email`, `phone`, `role` (manager|student)
- `business_name`, `address` (manager only)
- `membership_type`, `avatar_url`

**`rooms`** — Study rooms
- `id`, `manager_id`, `name`, `tier` (premium|standard), `total_seats`
- `join_key` (unique 8-char), `description`, `operating_hours` (JSONB)
- `latitude`, `longitude`, `radius` (geofence)

**`subscriptions`** — Student ↔ Room memberships
- `id`, `student_id`, `room_id`, `seat_number`, `tier`
- `start_date`, `end_date`, `status` (active|expired|pending)
- `membership_type` (digital|managed)
- `is_offline`, `invite_sent`, `invite_accepted` (flags)
- Unique constraint: (student_id, room_id)

**`attendance_logs`** — Daily attendance records
- `id`, `student_id`, `room_id`, `date`, `timestamp`
- `marked_by` (self|manager)
- Unique constraint: (student_id, room_id, date) — one entry per day

**`join_requests`** — Pending room applications
- `id`, `student_id`, `room_id`, `status` (pending|accepted|rejected)
- Unique constraint: (student_id, room_id) for pending

**`notes`** — Student study notes
- `id`, `student_id`, `room_id` (optional), `title`, `content`
- `tags` (array), `is_pinned`, `created_at`, `updated_at`

### Security
- **RLS on all tables** — managers see only their rooms/subscriptions; students see only their own data
- **Helper functions**: `is_room_manager()`, `is_room_student()`, `is_manager_of_student()`
- **Public RPC**: `verify_room_key()` — validates join key without exposing data
- **Trigger**: `handle_new_user()` — auto-creates profile row on auth signup

---

## Authentication & Middleware

1. **Signup** → Choose role → `auth.signUp()` → Postgres trigger creates profile → Email confirmation
2. **Login** → `signInWithPassword()` → Fetch role from profiles → Redirect to correct dashboard
3. **Session** — `@supabase/ssr` manages cookies in both Server and Client components
4. **Route protection** — Layout server components call `auth.getUser()`, redirect to `/login` if unauthenticated
5. **No explicit middleware file** — auth checks live in layout components

---

## Key Workflows

### Manager Enrolls Student
```
/manager/students/add  →  POST /api/manager/students/add
  → Create profile (if new)  →  Create subscription
  → (Optional) Send invite email via Resend
  → Student gets login credentials
```

### Student Joins via Key
```
Student → "Join Room" → Enter 8-char key
  → RPC verify_room_key()  →  Create join_request (pending)
  → Manager reviews  →  Approves with seat + dates
  → Subscription created  →  join_request = accepted
```

### Student Self Check-in
```
Student → "Scan QR"  →  Browser requests geolocation
  → Geofence check (Haversine distance vs. room radius)
  → QR scanner opens  →  Scan QR code
  → POST /api/student/attendance/check-in
  → API: re-validates geofence, inserts attendance_log (marked_by='self')
  → Streak recalculated  →  Calendar updated
```

### Manager Scans Student
```
Manager → "Attendance" button  →  AttendanceScanner full-screen
  → Scan student's access pass QR  →  Extract studentId + roomId
  → POST /api/manager/attendance/scan
  → Validate manager owns room  →  Insert attendance_log (marked_by='manager')
  → Success feedback with student name
```

---

## Notable Features

- **Dual attendance model** — self check-in (geofence + QR) or manager scan
- **Membership types** — Digital (app login) vs. Managed (offline/no smartphone)
- **Geofencing** — Haversine formula validates GPS proximity before check-in
- **Gamification** — Streaks (current + best), consistency score, focus level
- **Calendar heatmap** — Visual attendance history in both dashboards
- **Notes app** — Personal knowledge base with tags, pinning, search
- **QR codes** — Dual-purpose: room identification + personal student access pass
- **Email invitations** — React Email template via Resend for digital enrollment

---

## Current Uncommitted Changes (Git Status)

| File | Status |
|---|---|
| `manager/profile/ProfileClient.tsx` | Modified |
| `manager/profile/page.tsx` | Modified |
| `student/profile/StudentProfileClient.tsx` | Modified |
| `student/profile/page.tsx` | Modified |
| `src/app/api/manager/profile/` | New (untracked) |
| `src/app/api/student/profile/` | New (untracked) |
| `src/app/api/student/send-query/` | New (untracked) |
| `supabase_profile_otp.sql` | New (untracked) |
| `supabase_support_queries.sql` | New (untracked) |

Active work-in-progress: **profile editing + phone OTP verification** for both manager and student, plus the **send query** feature. Two new SQL migration files for the OTP and support query tables.
