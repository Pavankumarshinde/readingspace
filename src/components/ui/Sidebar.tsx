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
  // Manager Tabs
  { label: 'Rooms', href: '/manager/rooms', icon: 'meeting_room', role: 'manager' },
  { label: 'Students', href: '/manager/students', icon: 'group', role: 'manager' },
  { label: 'Dashboard', href: '/manager/dashboard', icon: 'dashboard', role: 'manager' },
  { label: 'Profile', href: '/manager/profile', icon: 'person', role: 'manager' },
  
  // Student Tabs
  { label: 'Rooms', href: '/student/rooms', icon: 'grid_view', role: 'student' },
  { label: 'Notes', href: '/student/notes', icon: 'description', role: 'student' },
  { label: 'Profile', href: '/student/profile', icon: 'person', role: 'student' },
]

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname()
  const filteredItems = navItems.filter(item => item.role === role || item.role === 'all')

  return (
    <aside className="hidden md:flex flex-col h-screen sticky top-0 bg-surface border-r border-outline-variant/20 transition-all duration-300 w-20 lg:w-64 shrink-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-6 flex items-center gap-3">
        <span className="material-symbols-outlined text-primary scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
          menu_book
        </span>
        <h1 className="hidden lg:block font-headline font-bold text-lg tracking-tighter text-primary">
          ReadingSpace
        </h1>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-1 mt-4">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all group ${
                isActive 
                  ? 'bg-primary/5 text-primary' 
                  : 'text-outline hover:bg-surface-container-low hover:text-primary'
              }`}
            >
              <span className={`material-symbols-outlined icon-sm ${isActive ? 'fill-icon' : ''}`}>
                {item.icon}
              </span>
              <span className="hidden lg:block text-xs font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Info Context */}
      <div className="p-4 border-t border-outline-variant/10">
        <div className="flex items-center gap-3 px-2 py-2 bg-surface-container-low rounded-2xl border border-outline-variant/5">
           <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
             <span className="material-symbols-outlined text-sm">shield_person</span>
           </div>
            <div className="hidden lg:block min-w-0">
               <p className="text-[10px] font-black text-on-surface truncate uppercase tracking-widest leading-none">
                 {role === 'manager' ? 'Admin' : 'My Account'}
               </p>
               <p className="text-[8px] text-outline truncate lowercase font-bold mt-1 opacity-50 italic">
                 {role === 'manager' ? 'manager.readingspace.in' : 'student.readingspace.in'}
               </p>
            </div>
        </div>
      </div>
    </aside>
  )
}
