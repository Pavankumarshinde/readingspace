'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { StudentBrandHeader } from '@/components/student/StudentHeader'
import NotesTab from '@/components/student/myspace/NotesTab'
import TasksTab from '@/components/student/myspace/TasksTab'
import CalendarTab from '@/components/student/myspace/CalendarTab'
import FocusTab from '@/components/student/myspace/FocusTab'
import DiaryTab from '@/components/student/myspace/DiaryTab'
import HabitsTab from '@/components/student/myspace/HabitsTab'
import { FileText, CheckCircle2, Calendar, Zap, Book, Flame, LucideIcon } from 'lucide-react'

type Tab = 'notes' | 'tasks' | 'calendar' | 'focus' | 'diary' | 'habits'

const TABS: { key: Tab; label: string; icon: LucideIcon }[] = [
  { key: 'notes',    label: 'Notes',    icon: FileText },
  { key: 'tasks',    label: 'Tasks',    icon: CheckCircle2 },
  { key: 'calendar', label: 'Calendar', icon: Calendar },
  { key: 'focus',    label: 'Focus',    icon: Zap },
  { key: 'diary',    label: 'Diary',    icon: Book },
  { key: 'habits',   label: 'Habits',   icon: Flame },
]

export default function MySpacePage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('notes')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserId(user.id)
      setLoading(false)
    }
    init()
  }, [router, supabase])

  if (loading || !userId) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface text-secondary/40">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Loading...</span>
      </div>
    )
  }

  return (
    <div className="page-shell">
      {/* Mobile brand header — fixed at very top */}
      <StudentBrandHeader />

      {/* ── Fixed Page Header: Title + Tab Bar ──────────────────────────── */}
      <div className="sticky-page-header pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] md:pt-0 shrink-0">
        {/* Page Title */}
        <div className="px-4 md:px-8 pt-4 pb-1 max-w-[1400px] mx-auto">
          <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-on-surface">My Space</h1>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-0.5">Your study corner</p>
        </div>

        {/* Tab Pill Bar — scrollable horizontally but fixed vertically */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 pt-0 px-4 md:px-8 max-w-[1400px] mx-auto scrollbar-none" style={{ scrollbarWidth: 'none' }}>
          {TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                activeTab === tab.key
                  ? 'bg-primary text-white shadow-sm shadow-primary/20'
                  : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <tab.icon size={13} />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable Tab Content ───────────────────────────────────────── */}
      <div className="scroll-area px-4 md:px-8 pt-2 pb-32 md:pb-8 max-w-[1400px] mx-auto w-full">
        <div className="animate-in fade-in duration-200" key={activeTab}>
          {activeTab === 'notes'    && <NotesTab    userId={userId} />}
          {activeTab === 'tasks'    && <TasksTab    userId={userId} />}
          {activeTab === 'calendar' && <CalendarTab userId={userId} />}
          {activeTab === 'focus'    && <FocusTab    userId={userId} />}
          {activeTab === 'diary'    && <DiaryTab    userId={userId} />}
          {activeTab === 'habits'   && <HabitsTab   userId={userId} />}
        </div>
      </div>
    </div>
  )
}
