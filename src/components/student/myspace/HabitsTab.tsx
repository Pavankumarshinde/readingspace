'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { format, subDays, isSameDay, parseISO } from 'date-fns'

interface Habit {
  id: string
  name: string
  icon: string
  created_at: string
}

interface HabitLog {
  id: string
  habit_id: string
  log_date: string
}

interface HabitsTabProps { userId: string }

const EMOJI_OPTIONS = ['⭐', '📚', '💪', '🏃', '💧', '🧘', '🎯', '🎨', '🎵', '🍎', '😴', '🌿', '✍️', '🧠', '🌞']

// Last 7 days + today (8 total columns)
function getLast8Days(): Date[] {
  return Array.from({ length: 8 }, (_, i) => subDays(new Date(), 7 - i))
}

export default function HabitsTab({ userId }: HabitsTabProps) {
  const supabase = createClient()
  const [habits, setHabits] = useState<Habit[]>([])
  const [logs, setLogs] = useState<HabitLog[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('⭐')

  const days = getLast8Days()
  const today = days[days.length - 1]

  useEffect(() => {
    fetchAll()
  }, [userId])

  const fetchAll = async () => {
    const [{ data: habitsData }, { data: logsData }] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId).order('created_at'),
      supabase.from('habit_logs').select('*').eq('user_id', userId)
        .gte('log_date', format(subDays(new Date(), 7), 'yyyy-MM-dd'))
    ])
    if (habitsData) setHabits(habitsData as Habit[])
    if (logsData) setLogs(logsData as HabitLog[])
    setLoading(false)
  }

  const isDone = (habitId: string, day: Date) =>
    logs.some(l => l.habit_id === habitId && isSameDay(parseISO(l.log_date), day))

  const toggleToday = async (habit: Habit) => {
    const todayStr = format(today, 'yyyy-MM-dd')
    const existing = logs.find(l => l.habit_id === habit.id && l.log_date === todayStr)
    if (existing) {
      await supabase.from('habit_logs').delete().eq('id', existing.id)
      setLogs(logs.filter(l => l.id !== existing.id))
    } else {
      const { data, error } = await supabase.from('habit_logs').insert({
        habit_id: habit.id, user_id: userId, log_date: todayStr,
      }).select().single()
      if (!error && data) setLogs([...logs, data as HabitLog])
    }
  }

  const addHabit = async () => {
    if (!newName.trim()) { toast.error('Enter a habit name'); return }
    const { data, error } = await supabase.from('habits').insert({
      user_id: userId, name: newName.trim(), icon: newIcon,
    }).select().single()
    if (error) { toast.error('Failed to add habit'); return }
    setHabits([...habits, data as Habit])
    setNewName('')
    setNewIcon('⭐')
    setShowModal(false)
    toast.success('Habit added!')
  }

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').delete().eq('id', id)
    setHabits(habits.filter(h => h.id !== id))
    setLogs(logs.filter(l => l.habit_id !== id))
    toast.success('Habit removed')
  }

  const getStreak = (habitId: string): number => {
    let streak = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if (isDone(habitId, days[i])) streak++
      else break
    }
    return streak
  }

  // Weekly completion %
  const totalPossible = habits.length * 8
  const totalDone = habits.reduce((acc, h) => acc + days.filter(d => isDone(h.id, d)).length, 0)
  const completionPct = totalPossible > 0 ? Math.round((totalDone / totalPossible) * 100) : 0

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Habits</h2>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">build consistency daily</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          Add Habit
        </button>
      </div>

      {/* Summary Bar */}
      {habits.length > 0 && (
        <div className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/15 rounded-xl px-5 py-3 mb-5 shadow-sm">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-secondary/60 mb-0.5">This Week</p>
            <p className="font-headline text-2xl font-bold text-primary">{completionPct}%</p>
          </div>
          <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden">
            <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${completionPct}%` }} />
          </div>
          <p className="text-xs text-on-surface-variant/50 font-medium">{totalDone}/{totalPossible} checks</p>
        </div>
      )}

      {/* Habit Table */}
      {loading ? (
        <div className="py-12 text-center text-sm text-on-surface-variant/40">Loading habits…</div>
      ) : habits.length === 0 ? (
        <div className="py-20 flex flex-col items-center text-center">
          <span className="text-5xl mb-4">🌱</span>
          <h3 className="font-headline text-lg font-bold text-on-surface mb-1">No habits yet</h3>
          <p className="text-xs text-on-surface-variant/50 mb-5">Start small — add your first habit</p>
          <button onClick={() => setShowModal(true)} className="px-5 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all">
            Add First Habit
          </button>
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 shadow-sm overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50 w-40">Habit</th>
                {days.map((day, i) => (
                  <th key={i} className="px-2 py-3 text-center">
                    <div className={`text-[10px] font-bold uppercase tracking-wider ${isSameDay(day, today) ? 'text-primary' : 'text-on-surface-variant/40'}`}>
                      {isSameDay(day, today) ? 'Today' : format(day, 'EEE')}
                    </div>
                    <div className={`text-xs font-semibold ${isSameDay(day, today) ? 'text-primary' : 'text-on-surface-variant/60'}`}>
                      {format(day, 'd')}
                    </div>
                  </th>
                ))}
                <th className="px-3 py-3 text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/50">Streak</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {habits.map(habit => {
                const streak = getStreak(habit.id)
                return (
                  <tr key={habit.id} className="border-b border-outline-variant/5 last:border-none group hover:bg-surface-container/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{habit.icon}</span>
                        <span className="text-sm font-semibold text-on-surface">{habit.name}</span>
                      </div>
                    </td>
                    {days.map((day, i) => {
                      const done = isDone(habit.id, day)
                      const isToday_ = isSameDay(day, today)
                      return (
                        <td key={i} className="px-2 py-3 text-center">
                          {isToday_ ? (
                            <button
                              onClick={() => toggleToday(habit)}
                              className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95 ${done ? 'bg-green-500 text-white shadow-sm' : 'bg-surface-container border border-outline/20 text-outline/30 hover:border-primary/40'}`}
                            >
                              {done && <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>check</span>}
                            </button>
                          ) : (
                            <div className={`w-7 h-7 mx-auto rounded-full flex items-center justify-center ${done ? 'bg-green-100 text-green-600' : 'bg-surface-container/50'}`}>
                              {done && <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>check</span>}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="px-3 py-3 text-center">
                      {streak > 0 ? (
                        <span className="inline-flex items-center gap-1 text-sm font-bold text-orange-600">
                          🔥 {streak}
                        </span>
                      ) : (
                        <span className="text-on-surface-variant/25 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <button
                        onClick={() => deleteHabit(habit.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-outline/40 hover:text-error"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>delete</span>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Habit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline text-xl font-bold text-on-surface">New Habit</h3>
              <button onClick={() => setShowModal(false)} className="text-outline/60 hover:text-on-surface">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1.5 block">Habit Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addHabit() }}
                  placeholder="e.g. Read 30 minutes"
                  className="w-full bg-surface-container border-none rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/30 font-body placeholder:text-outline/40"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Choose Icon</label>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map(em => (
                    <button
                      key={em}
                      onClick={() => setNewIcon(em)}
                      className={`w-9 h-9 rounded-lg text-xl transition-all hover:scale-110 ${newIcon === em ? 'bg-primary/15 ring-2 ring-primary/30' : 'bg-surface-container hover:bg-surface-container-high'}`}
                    >
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={addHabit} className="px-6 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm">Add Habit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
