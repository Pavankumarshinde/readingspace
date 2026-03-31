export type UserRole = 'manager' | 'student'
export type RoomTier = 'premium' | 'standard'
export type SubscriptionStatus = 'active' | 'expired' | 'pending'
export type JoinRequestStatus = 'pending' | 'accepted' | 'rejected'
export type AttendanceMarkedBy = 'self' | 'manager'
export type PaymentStatus = 'paid' | 'due' | 'overdue'

export interface Profile {
  id: string
  name: string
  email: string
  phone: string | null
  gender: string | null
  role: UserRole
  avatar_url: string | null
  business_name: string | null // manager only
  address: string | null // manager only
  created_at: string
}

export interface Room {
  id: string
  manager_id: string
  name: string
  tier: RoomTier
  total_seats: number
  description: string | null
  photo_url: string | null
  operating_hours: OperatingHours | null
  join_key: string
  created_at: string
}

export interface OperatingHours {
  open: string   // e.g. "07:00"
  close: string  // e.g. "22:00"
  days: string[] // e.g. ["Mon","Tue","Wed"]
}

export interface Subscription {
  id: string
  student_id: string
  room_id: string
  seat_number: string
  tier: RoomTier
  start_date: string   // ISO date "YYYY-MM-DD"
  end_date: string
  status: SubscriptionStatus
  is_offline: boolean
  invite_sent: boolean
  invite_accepted: boolean
  notes: string | null
  created_at: string
  // joined
  student?: Profile
  room?: Room
}

export interface AttendanceLog {
  id: string
  student_id: string
  room_id: string
  date: string  // "YYYY-MM-DD"
  marked_by: AttendanceMarkedBy
  timestamp: string
}

export interface JoinRequest {
  id: string
  student_id: string
  room_id: string
  status: JoinRequestStatus
  requested_at: string
  // joined
  student?: Profile
  room?: Room
}

export interface Note {
  id: string
  student_id: string
  title: string
  content: string
  tags: string[]
  room_id: string | null
  created_at: string
  updated_at: string
}

// Derived / composite types for UI
export interface RoomWithStats extends Room {
  active_students: number
  today_attendance: number
  manager?: Profile
}

export interface SubscriptionWithDetails extends Subscription {
  student: Profile
  room: Room
  days_remaining: number
  payment_status: PaymentStatus
  total_attended: number
  streak: number
}

export interface StudentCardData {
  subscription: Subscription
  profile: Profile
  room: Room
  days_remaining: number
  payment_status: PaymentStatus
  last_attended: string | null
  total_attended: number
}

// Dashboard summary for manager
export interface ManagerDashboardStats {
  total_active_students: number
  rooms_at_capacity: number
  today_attendance_pct: number
  expiring_this_week: number
  pending_requests: number
}

// Daily QR token payload
export interface QRPayload {
  roomId: string
  date: string
  token: string
}
