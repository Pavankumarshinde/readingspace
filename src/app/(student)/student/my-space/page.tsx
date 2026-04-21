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

type Tab = 'notes' | 'tasks' | 'calendar' | 'focus' | 'diary' | 'habits'

const TABS: { key: Tab; label: string; emoji: string }[] = [
  { key: 'notes',    label: 'Notes',    emoji: '📝' },
  { key: 'tasks',    label: 'Tasks',    emoji: '✅' },
  { key: 'calendar', label: 'Calendar', emoji: '📅' },
  { key: 'focus',    label: 'Focus',    emoji: '🎯' },
  { key: 'diary',    label: 'Diary',    emoji: '📔' },
  { key: 'habits',   label: 'Habits',   emoji: '🔥' },
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
      <div className="flex flex-col min-h-screen items-center justify-center bg-surface text-secondary/40">
        <div className="w-10 h-10 rounded-full border-4 border-primary border-t-transparent animate-spin mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest">Loading My Space…</span>
      </div>
    )
  }

  return (
    <>
      <StudentBrandHeader />

      <main className="pt-16 pb-28 md:pt-6 md:pb-12 px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* Page Header */}
        <div className="mb-5">
          <h1 className="font-headline text-2xl md:text-3xl font-bold tracking-tight text-on-surface">My Space</h1>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">your personal productivity hub</p>
        </div>

        {/* Tab Bar */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 mb-6 scrollbar-none">
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
              <span>{tab.emoji}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="animate-in fade-in duration-200" key={activeTab}>
          {activeTab === 'notes'    && <NotesTab    userId={userId} />}
          {activeTab === 'tasks'    && <TasksTab    userId={userId} />}
          {activeTab === 'calendar' && <CalendarTab userId={userId} />}
          {activeTab === 'focus'    && <FocusTab    userId={userId} />}
          {activeTab === 'diary'    && <DiaryTab    userId={userId} />}
          {activeTab === 'habits'   && <HabitsTab   userId={userId} />}
        </div>
      </main>
    </>
  )
}
