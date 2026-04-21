'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'

interface FocusSession {
  id: string
  task_name: string | null
  duration_minutes: number
  mode: string
  completed_at: string
}

interface FocusTabProps { userId: string }

type Mode = 'pomodoro' | 'short' | 'long'
const MODES: { key: Mode; label: string; emoji: string; secs: number }[] = [
  { key: 'pomodoro', label: 'Pomodoro', emoji: '🍅', secs: 25 * 60 },
  { key: 'short', label: 'Short Break', emoji: '☕', secs: 10 * 60 },
  { key: 'long', label: 'Long Break', emoji: '🧘', secs: 30 * 60 },
]

const RING_R = 80
const RING_CIRC = 2 * Math.PI * RING_R

export default function FocusTab({ userId }: FocusTabProps) {
  const supabase = createClient()
  const [mode, setMode] = useState<Mode>('pomodoro')
  const [totalSecs, setTotalSecs] = useState(25 * 60)
  const [secsLeft, setSecsLeft] = useState(25 * 60)
  const [running, setRunning] = useState(false)
  const [taskName, setTaskName] = useState('')
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    fetchSessions()
  }, [userId])

  const fetchSessions = async () => {
    const today = format(new Date(), 'yyyy-MM-dd')
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', userId)
      .gte('completed_at', `${today}T00:00:00`)
      .order('completed_at', { ascending: false })
    if (data) setSessions(data as FocusSession[])
  }

  const tick = useCallback(() => {
    setSecsLeft(prev => {
      if (prev <= 1) {
        handleComplete()
        return 0
      }
      return prev - 1
    })
  }, [mode, taskName, totalSecs])

  const handleComplete = async () => {
    setRunning(false)
    if (intervalRef.current) clearInterval(intervalRef.current)
    const modeData = MODES.find(m => m.key === mode)!
    const { data } = await supabase.from('focus_sessions').insert({
      user_id: userId,
      task_name: taskName || null,
      duration_minutes: Math.round(modeData.secs / 60),
      mode,
    }).select().single()
    if (data) setSessions(prev => [data as FocusSession, ...prev])
  }

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running, tick])

  const setModeAndReset = (m: Mode) => {
    setMode(m)
    const secs = MODES.find(x => x.key === m)!.secs
    setTotalSecs(secs)
    setSecsLeft(secs)
    setRunning(false)
  }

  const reset = () => {
    setSecsLeft(totalSecs)
    setRunning(false)
  }

  const skip = () => {
    setSecsLeft(0)
    setRunning(false)
    handleComplete()
  }

  const mins = Math.floor(secsLeft / 60).toString().padStart(2, '0')
  const secs = (secsLeft % 60).toString().padStart(2, '0')
  const progress = secsLeft / totalSecs
  const dashOffset = RING_CIRC * (1 - progress)

  return (
    <div className="w-full max-w-2xl">
      <div className="mb-6">
        <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Focus</h2>
        <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">deep work sessions</p>
      </div>

      {/* Mode Pills */}
      <div className="flex gap-2 mb-8">
        {MODES.map(m => (
          <button
            key={m.key}
            onClick={() => setModeAndReset(m.key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all ${mode === m.key ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'}`}
          >
            <span>{m.emoji}</span>{m.label}
          </button>
        ))}
      </div>

      {/* Timer Card */}
      <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-8 shadow-sm flex flex-col items-center mb-6">
        {/* SVG Ring */}
        <div className="relative mb-6">
          <svg width="200" height="200" className="rotate-[-90deg]">
            {/* Background ring */}
            <circle cx="100" cy="100" r={RING_R} fill="none" stroke="var(--color-surface-container)" strokeWidth="12" />
            {/* Progress ring */}
            <circle
              cx="100" cy="100" r={RING_R}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="12"
              strokeLinecap="round"
              strokeDasharray={RING_CIRC}
              strokeDashoffset={dashOffset}
              style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
            />
          </svg>
          {/* Timer text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-headline text-4xl font-bold text-on-surface tracking-tight tabular-nums">
              {mins}:{secs}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60 mt-1">
              {MODES.find(m => m.key === mode)?.label}
            </span>
          </div>
        </div>

        {/* Task Input */}
        <input
          type="text"
          placeholder="What are you working on?"
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          className="w-full max-w-xs bg-surface-container border-none rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/30 font-body placeholder:text-outline/40 mb-6 text-center"
        />

        {/* Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={reset}
            className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>restart_alt</span>
          </button>

          <button
            onClick={() => setRunning(!running)}
            className="w-16 h-16 rounded-full bg-primary text-white shadow-lg shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '28px' }}>{running ? 'pause' : 'play_arrow'}</span>
          </button>

          <button
            onClick={skip}
            className="w-10 h-10 rounded-full bg-surface-container text-on-surface-variant hover:bg-surface-container-high transition-all flex items-center justify-center"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>skip_next</span>
          </button>
        </div>
      </div>

      {/* Session Log */}
      <div>
        <h3 className="font-headline text-base font-bold text-on-surface mb-3">Today's Sessions</h3>
        {sessions.length === 0 ? (
          <div className="text-center py-8 text-on-surface-variant/40 text-sm">Complete a session to see it here</div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <div key={s.id} className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant/10 rounded-xl px-4 py-3">
                <span className="text-base">{MODES.find(m => m.key === s.mode)?.emoji ?? '🍅'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-on-surface truncate">{s.task_name || 'Focus session'}</p>
                  <p className="text-[10px] text-secondary/50 font-medium">{s.duration_minutes} min · {format(new Date(s.completed_at), 'h:mm a')}</p>
                </div>
                <span className="px-2 py-0.5 bg-primary/10 text-primary text-[9px] font-bold uppercase tracking-wider rounded-full">
                  {MODES.find(m => m.key === s.mode)?.label}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
