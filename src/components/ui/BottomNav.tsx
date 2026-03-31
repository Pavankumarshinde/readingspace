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
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-4 pb-8 pt-3 bg-white/80 backdrop-blur-xl border-t border-outline-variant/10 shadow-[0px_-8px_32px_rgba(25,28,29,0.06)] rounded-t-3xl">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center rounded-2xl px-5 py-2 transition-all duration-200 active:scale-90 ${
              isActive 
                ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' 
                : 'text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <span className={`material-symbols-outlined ${isActive ? 'fill-icon' : ''}`}>
               {item.icon}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest mt-1">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
