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
  StickyNote 
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: string
  role: UserRole | 'all'
}

const navItems = [
  // Manager Tabs (Aligned with newest UI)
  { label: 'Rooms', href: '/manager/rooms', icon: DoorOpen, role: 'manager' as const },
  { label: 'Students', href: '/manager/students', icon: Users, role: 'manager' as const },
  { label: 'Dashboard', href: '/manager/dashboard', icon: LayoutDashboard, role: 'manager' as const },
  { label: 'Profile', href: '/manager/profile', icon: User, role: 'manager' as const },
  
  // Student Tabs
  { label: 'Rooms', href: '/student/rooms', icon: Grid2X2, role: 'student' as const },
  { label: 'Notes', href: '/student/notes', icon: StickyNote, role: 'student' as const },
  { label: 'Profile', href: '/student/profile', icon: User, role: 'student' as const },
]

export default function BottomNav({ role }: { role: UserRole }) {
  const pathname = usePathname()

  const filteredItems = navItems.filter(
    (item) => (item.role as string) === (role as string) || (item.role as string) === 'all'
  )

  return (
    <nav className="fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-6 py-4 bg-surface/80 backdrop-blur-xl md:hidden h-20">
      {filteredItems.map((item) => {
        const isActive = pathname === item.href
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
            {isActive && <div className="absolute -top-4 w-1.5 h-1.5 bg-primary rounded-full" />}
            <item.icon className="transition-transform duration-300" size={22} strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold mt-1.5 tracking-[0.05em] uppercase">
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
