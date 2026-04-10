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
  Library
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: string
  role: UserRole | 'all'
}

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
  const filteredItems = navItems.filter(item => (item.role as string) === (role as string) || (item.role as string) === 'all')

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 bg-surface-container-low transition-all duration-300 w-[200px] shrink-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-8 flex flex-col items-start gap-6">
        <div className="w-12 h-12 rounded-[14px] bg-primary flex items-center justify-center text-white shadow-ambient">
          <Library size={24} />
        </div>
        <h1 className="font-display font-bold text-2xl tracking-tight text-on-surface leading-tight">
          Reading<br />Space
        </h1>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 space-y-2 mt-8">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-8 py-3 transition-all relative group ${
                isActive 
                  ? 'text-primary' 
                  : 'text-on-surface-variant/70 hover:text-on-surface'
              }`}
            >
              {isActive && <div className="sidebar-active-indicator" />}
              <item.icon className={`${isActive ? '' : 'opacity-50 group-hover:opacity-100'}`} size={20} />
              <span className={`text-[13px] font-semibold tracking-tight`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer / Metadata */}
      <div className="p-8 mt-auto">
        <div className="text-[10px] uppercase font-bold tracking-[0.08em] text-on-surface-variant/40">
          v0.1.0 ARCHIVE
        </div>
      </div>
    </aside>
  )
}

