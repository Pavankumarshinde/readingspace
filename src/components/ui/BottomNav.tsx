'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { UserRole } from '@/types'

interface NavItem {
  label: string
  href: string
  icon: string
  role: UserRole | 'all'
}

const navItems: NavItem[] = [
  // Manager Tabs (Aligned with newest UI)
  { label: 'Rooms', href: '/manager/rooms', icon: 'meeting_room', role: 'manager' },
  { label: 'Students', href: '/manager/students', icon: 'group', role: 'manager' },
  { label: 'Dashboard', href: '/manager/dashboard', icon: 'dashboard', role: 'manager' },
  { label: 'Profile', href: '/manager/profile', icon: 'person', role: 'manager' },
  
  // Student Tabs
  { label: 'Rooms', href: '/student/rooms', icon: 'grid_view', role: 'student' },
  { label: 'Notes', href: '/student/notes', icon: 'description', role: 'student' },
  { label: 'Profile', href: '/student/profile', icon: 'person', role: 'student' },
]

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => item.role === role || item.role === 'all'
  )

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 py-3 bg-surface/90 backdrop-blur-md border-t border-outline-variant/30 md:hidden h-16">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center transition-all duration-200 active:scale-90 ${
              isActive 
                ? 'text-primary' 
                : 'text-outline hover:text-primary'
            }`}
          >
            <span className={`material-symbols-outlined icon-sm ${isActive ? 'fill-icon' : ''}`}>
               {item.icon}
            </span>
            <span className="text-[10px] font-bold mt-1 tracking-tight">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
