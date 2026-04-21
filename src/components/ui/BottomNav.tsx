'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/types'
import { DoorOpen, Users, LayoutDashboard, User } from 'lucide-react'

// ── Student Nav Items (Material Symbols string IDs) ─────────────────────────
const studentNavItems = [
  { label: 'Rooms', href: '/student/rooms', icon: 'meeting_room' },
  { label: 'Notes', href: '/student/notes', icon: 'description' },
  { label: 'Profile', href: '/student/profile', icon: 'person' },
]

// ── Manager Nav Items (Lucide components)────────────────────────────────────
const managerNavItems = [
  { label: 'Rooms', href: '/manager/rooms', Icon: DoorOpen },
  { label: 'Profile', href: '/manager/profile', Icon: User },
]

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname()

  // ── Student — Floating Pill ────────────────────────────────────────────────
  if (role === 'student') {
    return (
      <nav className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1.5rem)] left-0 w-full z-50 flex justify-center pointer-events-none md:hidden">
        <div className="bg-surface/90 backdrop-blur-xl w-[90%] max-w-sm rounded-full px-6 h-14 flex justify-around items-center shadow-lg border border-outline-variant/10 pointer-events-auto">
          {studentNavItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === '/student/rooms' &&
                pathname.startsWith('/student/rooms'))
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors ${
                  isActive ? 'text-primary' : 'text-secondary/50'
                }`}
              >
                <span
                  className="material-symbols-outlined"
                  style={{
                    fontSize: '20px',
                    fontVariationSettings: isActive
                      ? "'FILL' 1, 'wght' 500"
                      : "'FILL' 0, 'wght' 400",
                  }}
                >
                  {item.icon}
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider">
                  {item.label}
                </span>
                {isActive && (
                  <div className="w-1 h-1 bg-primary rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    )
  }

  // ── Manager — Flat Bar ────────────────────────────────────────────────────
  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 pt-4 pb-[calc(env(safe-area-inset-bottom,0px)+1rem)] bg-surface/80 backdrop-blur-xl md:hidden min-h-[5rem] h-auto border-t border-outline-variant/10">
      {managerNavItems.map((item) => {
        const isActive = pathname === item.href ||
          (item.href === '/manager/rooms' && pathname.startsWith('/manager/rooms'))
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-all duration-300 relative ${
              isActive
                ? 'text-primary'
                : 'text-on-surface-variant/50 hover:text-on-surface'
            }`}
          >
            {isActive && (
              <div className="absolute -top-4 w-1.5 h-1.5 bg-primary rounded-full" />
            )}
            <item.Icon
              className="transition-transform duration-300"
              size={22}
              strokeWidth={isActive ? 2.5 : 2}
            />
            <span className="text-[10px] font-bold mt-1.5 tracking-[0.05em] uppercase">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
