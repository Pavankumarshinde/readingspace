'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO
} from 'date-fns'

interface CalEvent {
  id: string
  title: string
  event_date: string
  event_time: string | null
  color: string
}

interface CalendarTabProps { userId: string }

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const COLORS = ['#8B3A0F', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#d97706', '#0891b2']

export default function CalendarTab({ userId }: CalendarTabProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())
  const [showModal, setShowModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newTime, setNewTime] = useState('')
  const [newColor, setNewColor] = useState('#8B3A0F')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [userId])

  const fetchEvents = async () => {
    const { data } = await supabase.from('calendar_events').select('*').eq('user_id', userId).order('event_date')
    if (data) setEvents(data as CalEvent[])
    setLoading(false)
  }

  const addEvent = async () => {
    if (!newTitle.trim() || !newDate) { toast.error('Title and date are required'); return }
    const { data, error } = await supabase.from('calendar_events').insert({
      user_id: userId, title: newTitle.trim(), event_date: newDate, event_time: newTime || null, color: newColor
    }).select().single()
    if (error) { toast.error('Failed to add event'); return }
    setEvents([...events, data as CalEvent])
    toast.success('Event added')
    setShowModal(false)
    setNewTitle('')
    setNewTime('')
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(events.filter(e => e.id !== id))
    toast.success('Event removed')
  }

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getDay(monthStart) // 0=Sun
  const gridCells = [...Array(startPadding).fill(null), ...days]
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(parseISO(e.event_date), day))
  const selectedDayEvents = eventsOnDay(selectedDay)

  return (
    <div className="w-full">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="font-headline text-3xl font-bold tracking-tight text-on-surface">Calendar</h2>
          <p className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">plan your schedule</p>
        </div>
        <button
          onClick={() => { setNewDate(format(selectedDay, 'yyyy-MM-dd')); setShowModal(true) }}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 active:scale-95 transition-all shadow-sm"
        >
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
          Add Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
        {/* Calendar Grid */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 shadow-sm">
          {/* Month Nav */}
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_left</span>
            </button>
            <h3 className="font-headline text-lg font-bold text-on-surface">
              {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-8 h-8 rounded-lg hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-colors">
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>chevron_right</span>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-wider py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-0.5">
            {gridCells.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} />
              const dayEvents = eventsOnDay(day)
              const selected = isSameDay(day, selectedDay)
              const today = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDay(day)}
                  className={`relative flex flex-col items-center py-1.5 rounded-lg transition-all group ${
                    selected ? 'bg-primary text-white shadow-sm' :
                    today ? 'bg-primary/10 text-primary font-bold' :
                    inMonth ? 'hover:bg-surface-container text-on-surface' :
                    'text-on-surface-variant/30'
                  }`}
                >
                  <span className="text-[13px] font-semibold leading-tight">{format(day, 'd')}</span>
                  {dayEvents.length > 0 && (
                    <div className="flex gap-0.5 mt-0.5">
                      {dayEvents.slice(0, 3).map((ev, idx) => (
                        <span key={idx} className={`w-1 h-1 rounded-full ${selected ? 'bg-white/70' : ''}`} style={!selected ? { backgroundColor: ev.color } : {}} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Day Events Panel */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-[9px] font-bold uppercase tracking-widest text-secondary/60">
                {isToday(selectedDay) ? 'Today' : format(selectedDay, 'EEEE')}
              </p>
              <h4 className="font-headline text-xl font-bold text-on-surface">{format(selectedDay, 'MMM d')}</h4>
            </div>
            <button
              onClick={() => { setNewDate(format(selectedDay, 'yyyy-MM-dd')); setShowModal(true) }}
              className="w-7 h-7 rounded-lg bg-surface-container flex items-center justify-center text-primary hover:bg-primary hover:text-white transition-all"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
            </button>
          </div>

          {selectedDayEvents.length === 0 ? (
            <div className="py-8 text-center">
              <span className="material-symbols-outlined text-outline/20 mb-2 block" style={{ fontSize: '36px' }}>event_available</span>
              <p className="text-xs text-on-surface-variant/40 font-medium">No events</p>
            </div>
          ) : (
            <div className="space-y-2">
              {selectedDayEvents.map(ev => (
                <div key={ev.id} className="flex items-start gap-3 p-3 bg-surface-container rounded-xl group">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: ev.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">{ev.title}</p>
                    {ev.event_time && <p className="text-[10px] text-secondary/60 font-medium mt-0.5">{ev.event_time}</p>}
                  </div>
                  <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 transition-opacity text-outline/40 hover:text-error">
                    <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/15 w-full max-w-sm p-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-headline text-xl font-bold text-on-surface">Add Event</h3>
              <button onClick={() => setShowModal(false)} className="text-outline/60 hover:text-on-surface">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1.5 block">Title</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addEvent() }}
                  placeholder="Event title…"
                  className="w-full bg-surface-container border-none rounded-lg px-4 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/30 font-body placeholder:text-outline/40"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1.5 block">Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1.5 block">Time</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                    className="w-full bg-surface-container border-none rounded-lg px-3 py-2.5 text-sm text-on-surface outline-none focus:ring-1 focus:ring-primary/30" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60 mb-1.5 block">Color</label>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)} className={`w-6 h-6 rounded-full transition-transform hover:scale-110 ${newColor === c ? 'ring-2 ring-offset-2 ring-primary' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-xs font-bold text-on-surface-variant hover:bg-surface-container transition-colors">Cancel</button>
              <button onClick={addEvent} className="px-6 py-2 bg-primary text-white rounded-lg text-xs font-bold hover:opacity-90 transition-all active:scale-95 shadow-sm">Save Event</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
