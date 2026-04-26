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
    <div className="w-full max-w-6xl mx-auto">
      {/* Sticky inner header: Title + Mode pills */}
      <div className="sticky top-0 z-10 bg-surface pb-3">
        <div className="mb-3">
          <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Focus</h2>
          <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">Focus timer</p>
        </div>
        {/* Mode Pills */}
        <div className="flex gap-2 flex-wrap">
          {MODES.map(m => (
            <button
              key={m.key}
              onClick={() => setModeAndReset(m.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${mode === m.key ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-surface-container-high text-on-surface-variant hover:bg-white hover:text-primary active:scale-95 border border-outline-variant/10'}`}
            >
              <span className="text-sm">{m.emoji}</span>{m.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8 items-start">
        {/* Left Side: Timer and Controls */}
        <div className="space-y-6">
          {/* Timer Card */}
          <div className="bg-surface-container-lowest rounded-[2.5rem] border border-outline-variant/15 p-12 shadow-sm flex flex-col items-center">
            {/* SVG Ring */}
            <div className="relative mb-10">
              <svg width="240" height="240" className="rotate-[-90deg]">
                <circle cx="120" cy="120" r="100" fill="none" stroke="var(--color-surface-container)" strokeWidth="16" />
                <circle
                  cx="120" cy="120" r="100"
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="16"
                  strokeLinecap="round"
                  strokeDasharray={2 * Math.PI * 100}
                  strokeDashoffset={2 * Math.PI * 100 * (1 - progress)}
                  style={{ transition: running ? 'stroke-dashoffset 1s linear' : 'none' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline text-6xl font-bold text-on-surface tracking-tight tabular-nums italic">
                  {mins}:{secs}
                </span>
                <span className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/40 mt-3">
                  {MODES.find(m => m.key === mode)?.label}
                </span>
              </div>
            </div>

            {/* Task Input */}
            <input
              type="text"
              placeholder="WHAT ARE YOU WORKING ON??"
              value={taskName}
              onChange={e => setTaskName(e.target.value)}
              className="w-full max-w-sm bg-surface-container/50 border-none rounded-3xl px-8 py-5 text-sm font-bold text-on-surface outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface/10 mb-8 text-center uppercase tracking-widest"
            />

            {/* Controls */}
            <div className="flex items-center gap-6">
              <button
                onClick={reset}
                className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface hover:bg-white hover:text-primary transition-all flex items-center justify-center border border-outline-variant/10 active:scale-90"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>restart_alt</span>
              </button>

              <button
                onClick={() => setRunning(!running)}
                className="w-24 h-24 rounded-[2rem] bg-primary text-white shadow-2xl shadow-primary/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '42px' }}>{running ? 'pause' : 'play_arrow'}</span>
              </button>

              <button
                onClick={skip}
                className="w-14 h-14 rounded-2xl bg-surface-container text-on-surface hover:bg-white hover:text-primary transition-all flex items-center justify-center border border-outline-variant/10 active:scale-90"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '24px' }}>skip_next</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Session Log */}
        <div className="bg-surface-container-low rounded-[2.5rem] border border-outline-variant/15 p-8 shadow-sm h-full min-h-[600px] flex flex-col">
          <div className="flex flex-col mb-8">
            <span className="text-[10px] font-black text-tertiary uppercase tracking-[0.4em] mb-1">HISTORY</span>
            <h3 className="font-headline text-2xl font-bold text-on-surface">Today's Sessions</h3>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {sessions.length === 0 ? (
              <div className="text-center py-20 text-on-surface-variant/20 italic text-[11px] font-bold uppercase tracking-widest border border-dashed border-outline-variant/20 rounded-3xl">
                Ready for Focus
              </div>
            ) : (
              sessions.map(s => (
                <div key={s.id} className="flex items-center gap-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-5 py-4 transition-all hover:bg-white hover:shadow-xl hover:shadow-primary/5">
                  <span className="text-xl">{MODES.find(m => m.key === s.mode)?.emoji ?? '🍅'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-on-surface truncate uppercase tracking-tighter">{s.task_name || 'Focus Session'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-on-surface/40 font-bold">{s.duration_minutes} MIN</span>
                      <span className="w-1 h-1 rounded-full bg-on-surface/20" />
                      <span className="text-[10px] text-primary font-black">{format(new Date(s.completed_at), 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-surface-container text-on-surface-variant/60 text-[9px] font-black uppercase tracking-widest rounded-full">
                    {MODES.find(m => m.key === s.mode)?.key}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
