import { format, formatDistanceToNow, differenceInDays, parseISO } from 'date-fns'

export function formatDate(date: string, fmt = 'MMM d, yyyy'): string {
  return format(parseISO(date), fmt)
}

export function daysUntilExpiry(endDate: string): number {
  return differenceInDays(parseISO(endDate), new Date())
}

export function isExpired(endDate: string): boolean {
  return daysUntilExpiry(endDate) < 0
}

export function isExpiringSoon(endDate: string, days = 7): boolean {
  const d = daysUntilExpiry(endDate)
  return d >= 0 && d <= days
}

export function expiryLabel(endDate: string): string {
  const d = daysUntilExpiry(endDate)
  if (d < 0) return 'Expired'
  if (d === 0) return 'Expires today'
  if (d === 1) return 'Expires in 1d'
  return `Expires in ${d}d`
}

export function timeAgo(date: string): string {
  return formatDistanceToNow(parseISO(date), { addSuffix: true })
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

// Consistent avatar color based on name
// Vibrant Modern (Prism) Color Spectrum
const AVATAR_COLORS = [
  '#4F46E5', // Indigo-600
  '#0D6E6E', // Primary Teal
  '#06B6D4', // Cyan-500
  '#8B5CF6', // Violet-500
  '#10B981', // Emerald-500
  '#F43F5E', // Rose-500
  '#6366F1', // Indigo-500
  '#14B8A6', // Teal-500
]
export function avatarColor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

export function formatSeat(seat: string): string {
  return seat.toUpperCase()
}

export function subscriptionProgress(startDate: string, endDate: string): number {
  const total = differenceInDays(parseISO(endDate), parseISO(startDate))
  const elapsed = differenceInDays(new Date(), parseISO(startDate))
  return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)))
}

export function generateJoinKey(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export function getDaysInMonth(year: number, month: number): Date[] {
  const days: Date[] = []
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
    days.push(new Date(d))
  }
  return days
}
