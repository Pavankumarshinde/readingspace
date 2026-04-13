'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/types'
import {
  DoorOpen,
  Users,
  LayoutDashboard,
  User,
  Grid2X2,
  StickyNote,
  Library,
} from 'lucide-react'

const navItems = [
  // Manager Tabs
  { label: 'Rooms', href: '/manager/rooms', icon: DoorOpen, role: 'manager' as const },
  { label: 'Students', href: '/manager/students', icon: Users, role: 'manager' as const },
  { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard, role: 'manager' as const },
  { label: 'Profile', href: '/manager/profile', icon: User, role: 'manager' as const },

  // Student Tabs
  { label: 'Rooms', href: '/student/rooms', icon: Grid2X2, role: 'student' as const },
  { label: 'Notes', href: '/student/notes', icon: StickyNote, role: 'student' as const },
  { label: 'Profile', href: '/student/profile', icon: User, role: 'student' as const },
]

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const filteredItems = navItems.filter(
    (item) =>
      (item.role as string) === (role as string) ||
      (item.role as string) === 'all'
  )

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 bg-surface-container-low transition-all duration-300 w-[200px] shrink-0 overflow-y-auto border-r border-outline-variant/10">
      {/* Brand Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3">
        <span
          className="material-symbols-outlined text-primary font-bold"
          style={{ fontSize: '20px', fontVariationSettings: "'wght' 600" }}
        >
          menu
        </span>
        <h1 className="font-headline italic text-xl font-semibold text-primary tracking-tight">
          ReadingSpace
        </h1>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 mt-4 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === '/student/rooms' &&
              pathname.startsWith('/student/rooms')) ||
            (item.href === '/manager/rooms' &&
              pathname.startsWith('/manager/rooms'))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 transition-all relative group ${
                isActive
                  ? 'text-primary'
                  : 'text-on-surface-variant/60 hover:text-on-surface'
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={isActive ? '' : 'opacity-50 group-hover:opacity-100'}
                size={16}
              />
              <span className="text-[12px] font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3">
        <div className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant/30">
          v0.1.0
        </div>
      </div>
    </aside>
  )
}
