'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameDay, isSameMonth, isToday, addMonths, subMonths, parseISO
} from 'date-fns'
import { Plus, Bell, Clock, Trash2, Calendar as CalIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'

interface CalEvent {
  id: string
  title: string
  event_date: string
  event_time: string | null
  color: string
}

interface Reminder {
  id: string
  label: string
  reminder_time: string
  reminder_date: string | null
  repeat_days: number[]
  is_enabled: boolean
}

interface CalendarTabProps { userId: string }

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const DAY_LABELS = [
  { label: 'S', value: 0 },
  { label: 'M', value: 1 },
  { label: 'T', value: 2 },
  { label: 'W', value: 3 },
  { label: 'T', value: 4 },
  { label: 'F', value: 5 },
  { label: 'S', value: 6 },
]
const COLORS = ['#8B3A0F', '#2563eb', '#16a34a', '#9333ea', '#dc2626', '#d97706', '#0891b2']

export default function CalendarTab({ userId }: CalendarTabProps) {
  const supabase = createClient()
  const [events, setEvents] = useState<CalEvent[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date>(new Date())

  // Modals
  const [showEventModal, setShowEventModal] = useState(false)
  const [showReminderModal, setShowReminderModal] = useState(false)

  // ... (keeping other form states consistent)
  const [newTitle, setNewTitle] = useState('')
  const [newDate, setNewDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [newTime, setNewTime] = useState('')
  const [newColor, setNewColor] = useState('#8B3A0F')

  const [remLabel, setRemLabel] = useState('')
  const [remTime, setRemTime] = useState('08:00')
  const [remRepeatDays, setRemRepeatDays] = useState<number[]>([])
  const [remSelectedDate, setRemSelectedDate] = useState('')

  useEffect(() => {
    fetchAll()
  }, [userId])

  const fetchAll = async () => {
    setLoading(true)
    const [{ data: evData }, { data: rmData }] = await Promise.all([
      supabase.from('calendar_events').select('*').eq('user_id', userId).order('event_date'),
      supabase.from('reminders').select('*').eq('user_id', userId).order('reminder_time')
    ])
    if (evData) setEvents(evData as CalEvent[])
    if (rmData) setReminders(rmData as Reminder[])
    setLoading(false)
  }

  // --- Event Logic ---
  const addEvent = async () => {
    if (!newTitle.trim() || !newDate) { toast.error('Title and date are required'); return }
    const { data, error } = await supabase.from('calendar_events').insert({
      user_id: userId, title: newTitle.trim(), event_date: newDate, event_time: newTime || null, color: newColor
    }).select().single()
    if (error) { toast.error('Failed to add event'); return }
    setEvents([...events, data as CalEvent])
    toast.success('Event added')
    setShowEventModal(false)
    setNewTitle('')
  }

  const deleteEvent = async (id: string) => {
    await supabase.from('calendar_events').delete().eq('id', id)
    setEvents(events.filter(e => e.id !== id))
    toast.success('Removed')
  }

  // --- Reminder Logic ---
  const addReminder = async () => {
    if (!remLabel.trim()) { toast.error('Label required'); return }
    const { data, error } = await supabase.from('reminders').insert({
      user_id: userId, label: remLabel.trim(), reminder_time: remTime, 
      reminder_date: remSelectedDate || null, repeat_days: remRepeatDays, is_enabled: true
    }).select().single()
    if (error) { toast.error('Failed to set reminder'); return }
    setReminders([...reminders, data as Reminder])
    toast.success('Reminder set')
    setShowReminderModal(false)
    resetRemForm()
  }

  const toggleReminder = async (reminder: Reminder) => {
    const newState = !reminder.is_enabled
    const { error } = await supabase.from('reminders').update({ is_enabled: newState }).eq('id', reminder.id)
    if (!error) setReminders(reminders.map(r => r.id === reminder.id ? { ...r, is_enabled: newState } : r))
  }

  const deleteReminder = async (id: string) => {
    await supabase.from('reminders').delete().eq('id', id)
    setReminders(reminders.filter(r => r.id !== id))
    toast.success('Deleted')
  }

  const resetRemForm = () => {
    setRemLabel('')
    setRemTime('08:00')
    setRemRepeatDays([])
    setRemSelectedDate('')
  }

  // --- Calendar Helpers ---
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startPadding = getDay(monthStart)
  const gridCells = [...Array(startPadding).fill(null), ...calendarDays]
  while (gridCells.length % 7 !== 0) gridCells.push(null)

  const eventsOnDay = (day: Date) => events.filter(e => isSameDay(parseISO(e.event_date), day))
  const selectedDayEvents = eventsOnDay(selectedDay)

  const formatTime = (t: string) => {
    const [h, m] = t.split(':')
    const hour = parseInt(h)
    return `${hour % 12 || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`
  }

  return (
    <div className="w-full">
      {/* Sticky inner header */}
      <div className="sticky top-0 z-10 bg-surface pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-headline text-2xl font-bold tracking-tight text-on-surface">Calendar</h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">Your schedule</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setNewDate(format(selectedDay, 'yyyy-MM-dd')); setShowEventModal(true) }}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={14} />
              Add Event
            </button>
            <button
              onClick={() => setShowReminderModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-high text-on-surface rounded-xl text-[11px] font-black uppercase tracking-widest border border-outline-variant/10 hover:bg-surface-container-highest active:scale-95 transition-all"
            >
              <Bell size={14} />
              Reminder
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-4">
        {/* Main Grid */}
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/15 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-8 px-2">
            <h3 className="font-headline text-2xl font-bold text-on-surface">{format(currentMonth, 'MMMM yyyy')}</h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all hover:scale-105 active:scale-95">
                <ChevronLeft size={20} />
              </button>
              <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="w-10 h-10 rounded-xl hover:bg-surface-container flex items-center justify-center text-on-surface-variant transition-all hover:scale-105 active:scale-95">
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-4">
            {DAYS_SHORT.map(d => (
              <div key={d} className="text-center text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.2em]">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {gridCells.map((day, i) => {
              if (!day) return <div key={`pad-${i}`} className="aspect-square" />
              const dayEvs = eventsOnDay(day)
              const selected = isSameDay(day, selectedDay)
              const isToday_ = isToday(day)
              const inMonth = isSameMonth(day, currentMonth)
              return (
                <button
                  key={day.toString()}
                  onClick={() => setSelectedDay(day)}
                  className={`aspect-square relative flex flex-col items-center justify-center rounded-2xl transition-all group ${
                    selected ? 'bg-primary text-white shadow-xl scale-105 z-10' :
                    isToday_ ? 'bg-primary/5 text-primary font-black ring-1 ring-primary/20' :
                    inMonth ? 'hover:bg-surface-container text-on-surface' : 'text-on-surface-variant/20'
                  }`}
                >
                  <span className="text-sm font-bold">{format(day, 'd')}</span>
                  {dayEvs.length > 0 && (
                    <div className="absolute bottom-2 flex gap-0.5">
                      {dayEvs.slice(0, 3).map((ev, idx) => (
                        <span key={idx} className={`w-1 h-1 rounded-full ${selected ? 'bg-white/70' : ''}`} style={!selected ? { backgroundColor: ev.color } : {}} />
                      ))}
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sidebar - Unified View */}
        <div className="flex flex-col gap-5 bg-surface-container-low rounded-2xl border border-outline-variant/15 p-5 shadow-sm overflow-hidden min-h-[500px]">
          <div className="flex-1 overflow-y-auto space-y-8 scroll-smooth custom-scrollbar">
            {/* Agenda Section */}
            <div>
              <div className="flex flex-col mb-5">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.4em] mb-1">Agenda</span>
                <h4 className="font-headline text-xl font-bold text-on-surface">{format(selectedDay, 'MMM d, EEEE')}</h4>
              </div>
              
              {selectedDayEvents.length === 0 ? (
                <div className="py-10 text-center text-on-surface-variant/30 italic text-[11px] font-bold uppercase tracking-widest border border-outline-variant/10 rounded-3xl bg-surface-container-lowest/50">
                  No events found
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayEvents.map(ev => (
                    <div key={ev.id} className="relative p-4 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl group transition-all hover:bg-white hover:border-primary/20">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <h5 className="text-sm font-black text-on-surface truncate mb-1">{ev.title}</h5>
                          <div className="flex items-center gap-2 text-[10px] text-primary font-black uppercase tracking-widest">
                            <Clock size={12} />
                            {ev.event_time || 'All-day'}
                          </div>
                        </div>
                        <button onClick={() => deleteEvent(ev.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-on-surface-variant/30 hover:text-red-500 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Alarms Section */}
            <div>
              <div className="flex flex-col mb-5">
                <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.4em] mb-1">Routine</span>
                <h4 className="font-headline text-xl font-bold text-on-surface">Active Alarms</h4>
              </div>

              {reminders.length === 0 ? (
                <div className="py-10 text-center text-on-surface-variant/30 italic text-[11px] font-bold uppercase tracking-widest border border-outline-variant/10 rounded-3xl bg-surface-container-lowest/50">
                  No Saved Alarms
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map(r => (
                    <div key={r.id} className={`p-4 rounded-2xl border transition-all ${r.is_enabled ? 'bg-surface-container-lowest border-tertiary/10 shadow-sm' : 'bg-surface-container-lowest/40 border-outline-variant/10 opacity-60 grayscale'}`}>
                      <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2">
                           <Bell size={12} className={r.is_enabled ? 'text-tertiary' : 'text-on-surface/40'} />
                           <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">{r.label}</span>
                         </div>
                         <button 
                           onClick={() => toggleReminder(r)}
                           className={`w-8 h-4 rounded-full p-0.5 relative transition-colors ${r.is_enabled ? 'bg-tertiary' : 'bg-on-surface-variant/20'}`}
                         >
                            <div className={`w-3 h-3 rounded-full bg-white transform transition-transform ${r.is_enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                         </button>
                      </div>
                      <div className={`text-2xl font-headline font-bold italic tracking-tight mb-3 ${r.is_enabled ? 'text-on-surface' : 'text-on-surface/40'}`}>{formatTime(r.reminder_time)}</div>
                      <div className="flex items-center justify-between">
                         <div className="flex gap-1">
                            {DAY_LABELS.map(d => (
                              <span key={d.value} className={`text-[8px] font-black w-4.5 h-4.5 flex items-center justify-center rounded-full transition-all ${r.repeat_days.includes(d.value) ? r.is_enabled ? 'bg-tertiary/10 text-tertiary font-black' : 'bg-on-surface-variant/10 text-on-surface-variant/30' : 'text-on-surface-variant/15'}`}>
                                {d.label}
                              </span>
                            ))}
                         </div>
                         <button onClick={() => deleteReminder(r.id)} className="text-on-surface-variant/20 hover:text-red-500 transition-colors">
                           <Trash2 size={12} />
                         </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modals Updated to remove black background */}
      {showEventModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-headline font-bold text-on-surface">Add Event</h3>
               <button onClick={() => setShowEventModal(false)} className="p-2 text-on-surface-variant/40 hover:text-on-surface transition-colors">
                 <X size={20} />
               </button>
            </div>
            {/* ... rest of event form ... */}
            <div className="space-y-5">
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Event Name</label>
                <input 
                  type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="What is the event??"
                  className="w-full bg-surface-container border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-on-surface focus:ring-1 focus:ring-primary/20 transition-all outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Target Date</label>
                  <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} className="w-full bg-surface-container border-none rounded-2xl px-4 py-3 text-xs font-bold text-on-surface outline-none" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Time</label>
                  <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)} className="w-full bg-surface-container border-none rounded-2xl px-4 py-3 text-xs font-bold text-on-surface outline-none" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-2 block">Pick a Color</label>
                <div className="flex gap-2.5">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setNewColor(c)} className={`w-8 h-8 rounded-full transition-all hover:scale-110 ${newColor === c ? 'ring-2 ring-offset-2 ring-primary ring-offset-surface-container-lowest' : ''}`} style={{ backgroundColor: c }} />
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowEventModal(false)} className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container transition-all">Cancel</button>
              <button onClick={addEvent} className="flex-1 py-4 bg-primary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all">Save Event</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Reminder Modal - Themed to match app */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl w-full max-w-sm p-8 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-2xl font-headline font-bold text-on-surface">Set Alarm</h3>
               <button onClick={() => setShowReminderModal(false)} className="p-2 text-on-surface-variant/40 hover:text-on-surface transition-colors">
                 <X size={20} />
               </button>
            </div>
            <div className="space-y-6">
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 block">Alarm Time</label>
                <input type="time" value={remTime} onChange={e => setRemTime(e.target.value)} className="w-full bg-surface-container border-none rounded-2xl px-6 py-5 text-4xl font-headline font-bold italic text-on-surface focus:outline-none focus:ring-1 focus:ring-tertiary/20 transition-all" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 block">Alarm Label</label>
                <input type="text" value={remLabel} onChange={e => setRemLabel(e.target.value)} placeholder="Wake up protocol…" className="w-full bg-surface-container border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-on-surface placeholder:text-on-surface-variant/20 outline-none" />
              </div>
              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 mb-3 block">Recurrence</label>
                <div className="flex justify-between gap-1.5">
                  {DAY_LABELS.map(day => (
                    <button
                      key={day.value}
                      onClick={() => setRemRepeatDays(prev => prev.includes(day.value) ? prev.filter(d => d !== day.value) : [...prev, day.value])}
                      className={`w-9 h-9 rounded-full text-[10px] font-black transition-all border ${remRepeatDays.includes(day.value) ? 'bg-tertiary border-tertiary text-white shadow-lg shadow-tertiary/10' : 'bg-surface-container border-none text-on-surface-variant/40'}`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-10 flex gap-3">
              <button onClick={() => setShowReminderModal(false)} className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container transition-all">Cancel</button>
              <button onClick={addReminder} className="flex-1 py-4 bg-tertiary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-tertiary/20 hover:scale-[1.02] active:scale-95 transition-all">Set Alarm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
