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
    <aside className="hidden md:flex flex-col h-screen sticky top-0 bg-white border-r border-slate-200 transition-all duration-300 w-20 lg:w-64 shrink-0 overflow-y-auto">
      {/* Brand Header */}
      <div className="p-8 flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-sm border border-primary/5">
          <span className="material-symbols-outlined scale-110" style={{ fontVariationSettings: "'FILL' 1" }}>
            library_books
          </span>
        </div>
        <h1 className="hidden lg:block font-headline font-extrabold text-lg tracking-tight text-on-surface">
          Reading<span className="text-primary">Space</span>
        </h1>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-4 space-y-1.5 mt-6">
        {filteredItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all group ${
                isActive 
                  ? 'bg-primary text-white shadow-xl shadow-primary/20' 
                  : 'text-on-surface-variant hover:bg-slate-100 hover:text-on-surface'
              }`}
            >
              <span className={`material-symbols-outlined text-[22px] ${isActive ? 'fill-icon' : 'opacity-70 group-hover:opacity-100'}`}>
                {item.icon}
              </span>
              <span className={`hidden lg:block text-sm font-bold tracking-tight ${isActive ? '' : 'opacity-80'}`}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </nav>

      {/* Footer / User Info Context */}
      <div className="p-6 border-t border-slate-100">
        <div className="flex items-center gap-4 p-3 bg-slate-50 rounded-2xl border border-slate-100">
           <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100 shrink-0">
             <span className="material-symbols-outlined text-[20px]">account_circle</span>
           </div>
            <div className="hidden lg:block min-w-0">
               <p className="text-[11px] font-extrabold text-on-surface truncate uppercase tracking-wider mb-0.5">
                 {role === 'manager' ? 'Admin' : 'Student'}
               </p>
               <p className="text-[10px] text-on-surface-variant truncate font-medium opacity-60">
                 {role === 'manager' ? 'Control Panel' : 'User Portal'}
               </p>
            </div>
        </div>
      </div>
    </aside>
  )
}

