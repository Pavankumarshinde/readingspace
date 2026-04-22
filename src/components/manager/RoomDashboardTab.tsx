'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameDay, startOfDay, endOfDay,
  getDaysInMonth, getDay
} from 'date-fns'
import { useRealtimeAttendance } from '@/hooks/useRealtimeAttendance'
import toast from 'react-hot-toast'

type Timeframe = 'day' | 'week' | 'month'

export default function RoomDashboardTab({ roomId, roomName }: { roomId: string, roomName: string }) {
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<Timeframe>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewDate, setViewDate] = useState<Date>(new Date())

  const [expiringPlans, setExpiringPlans] = useState<any[]>([])
  const [expiringViewDate, setExpiringViewDate] = useState<Date>(new Date())
  const [expiringLoading, setExpiringLoading] = useState(true)

  const [heatmap, setHeatmap] = useState<Record<number, number>>({})
  const [filteredCount, setFilteredCount] = useState(0)
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [searchTermExpiring, setSearchTermExpiring] = useState('')
  const [searchTermHistory, setSearchTermHistory] = useState('')

  // Real-time logs for the room
  const realtimeLogs = useRealtimeAttendance(roomId)
  const attendanceLogs = timeframe === 'day' && isSameDay(selectedDate, new Date())
    ? realtimeLogs
    : [] // We'll still fetch historical data in useEffect

  const [historicalLogs, setHistoricalLogs] = useState<any[]>([])
  const displayLogs = (attendanceLogs.length > 0 ? attendanceLogs : historicalLogs).filter(log =>
    (log.student?.name || '').toLowerCase().includes(searchTermHistory.toLowerCase())
  )

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      const supabase = createClient()

      let rangeStart: Date;
      let rangeEnd: Date;
      if (timeframe === 'day') {
        rangeStart = startOfDay(selectedDate)
        rangeEnd = endOfDay(selectedDate)
      } else if (timeframe === 'week') {
        rangeStart = startOfWeek(selectedDate)
        rangeEnd = endOfWeek(selectedDate)
      } else {
        rangeStart = startOfMonth(selectedDate)
        rangeEnd = endOfMonth(selectedDate)
      }

      setAttendanceLoading(true)
      const { data: logsData } = await supabase.from('attendance_logs').select(`*, student:profiles!inner(name, email)`).eq('room_id', roomId).gte('timestamp', rangeStart.toISOString()).lte('timestamp', rangeEnd.toISOString()).order('timestamp', { ascending: false })

      const monthStart = startOfMonth(viewDate)
      const monthEnd = endOfMonth(viewDate)
      const { data: monthDots } = await supabase.from('attendance_logs').select('timestamp').eq('room_id', roomId).gte('timestamp', monthStart.toISOString()).lte('timestamp', monthEnd.toISOString())

      const heatMapData: Record<number, number> = {}
      monthDots?.forEach(log => {
        const d = new Date(log.timestamp).getDate()
        heatMapData[d] = (heatMapData[d] || 0) + 1
      })
      setHeatmap(heatMapData)

      if (logsData) {
        const { data: seats } = await supabase
          .from('subscriptions')
          .select('student_id, seat_number')
          .eq('room_id', roomId)
          .eq('status', 'active')

        const seatMap = new Map((seats || []).map(s => [s.student_id, s.seat_number]))

        const mappedLogs = logsData.map(log => ({
          ...log,
          seat_number: seatMap.get(log.student_id) || 'N/A'
        }))

        setHistoricalLogs(mappedLogs)
        setFilteredCount(mappedLogs.length)
      }

      setAttendanceLoading(false)
      setLoading(false)
    }
    fetchDashboardData()
  }, [roomId, timeframe, selectedDate, viewDate])

  useEffect(() => {
    const fetchExpiringPlans = async () => {
      setExpiringLoading(true)
      const supabase = createClient()
      const start = startOfMonth(expiringViewDate)
      const end = endOfMonth(expiringViewDate)

      const { data: expiringSubs } = await supabase
        .from('subscriptions')
        .select(`id, end_date, seat_number, status, room_id, student_id, student:profiles!inner(name, email)`)
        .eq('room_id', roomId)
        .gte('end_date', start.toISOString().split('T')[0])
        .lte('end_date', end.toISOString().split('T')[0])
        .order('end_date', { ascending: true })

      const today = startOfDay(new Date())
      const mappedExpiring = (expiringSubs || []).map(sub => {
        const endDate = startOfDay(new Date(sub.end_date))
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
        return {
          name: (sub.student as any).name || 'Unknown',
          initial: ((sub.student as any).name || 'U').substring(0, 2).toUpperCase(),
          seat: sub.seat_number,
          daysLeft: diffDays,
          isExpired: endDate < today
        }
      })
      setExpiringPlans(mappedExpiring)
      setExpiringLoading(false)
    }
    fetchExpiringPlans()
  }, [roomId, expiringViewDate])

  const handleRegenerateRoomQR = async () => {
    if (!confirm('This will invalidate the current Room QR code. All physical prints of the old QR will stop working. Proceed?')) return
    try {
      const res = await fetch('/api/manager/rooms/regenerate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        toast.success('Room QR regenerated successfully')
        // The page will re-fetch data naturally if we trigger a refresh or it's handled by state
        window.location.reload() // Simple way to refresh all room data including version
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to regenerate')
      }
    } catch (e) {
      toast.error('Network failure')
    }
  }

  const handleRegenerateStudentPass = async (subscriptionId: string) => {
    if (!confirm('Invalidate this student\'s current access pass and issue a new one?')) return
    try {
      const res = await fetch('/api/manager/students/regenerate-pass', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId })
      })
      if (res.ok) {
        toast.success('Student pass regenerated')
        // Refresh the student list or just this specific student if managed in parent
        // For now, reload or trigger parent fetch
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to regenerate')
      }
    } catch (e) {
      toast.error('Network failure')
    }
  }

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      {/* Dashboard Top Bar (Simplified to Full-Width Filter) */}
      <div className="w-full">
        <div className="p-1.5 bg-surface-container-low rounded-2xl flex gap-1.5 w-full shadow-inner">
          {(['day', 'week', 'month'] as Timeframe[]).map((t) => (
            <button
              key={t}
              onClick={() => setTimeframe(t)}
              className={`flex-1 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${timeframe === t
                ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]'
                : 'text-on-surface/40 hover:text-on-surface/60 hover:bg-surface-container/50'
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* LEFT COLUMN: Controls & Heatmap */}
        <div className="space-y-8">

          {/* Calendar Explorer */}
          <div className="card bg-white border border-outline-variant/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex flex-col">
                <h3 className="text-xl font-black italic text-on-surface">Attendance Heatmap</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">
                  {format(viewDate, 'MMMM yyyy')}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface">
                  <ChevronLeft size={20} />
                </button>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors text-on-surface">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-4 text-center">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <span key={`${d}-${i}`} className="text-[9px] font-black text-on-surface-variant/20 uppercase tracking-widest mb-2">{d}</span>
              ))}
              {Array.from({ length: getDay(startOfMonth(viewDate)) }).map((_, i) => (
                <div key={`empty-${i}`} />
              ))}
              {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                const day = i + 1
                const count = heatmap[day] || 0
                const isSelected = isSameDay(selectedDate, new Date(viewDate.getFullYear(), viewDate.getMonth(), day))

                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(viewDate.getFullYear(), viewDate.getMonth(), day))}
                    className={`relative w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-xs font-black transition-all group ${isSelected
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-110'
                      : count > 0
                        ? 'bg-primary/5 text-primary border border-primary/10'
                        : 'text-on-surface/20'
                      }`}
                  >
                    {day}
                    {count > 0 && !isSelected && (
                      <span className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Expiring & Stars */}
        <div className="relative h-[500px] lg:h-auto lg:h-full w-full">
          {/* Expiring Plans */}
          <div className="lg:absolute lg:inset-0 w-full h-full">
            <div className="card bg-white border border-outline-variant/10 rounded-[2.5rem] p-6 lg:p-8 h-full flex flex-col w-full">
              <div className="flex flex-col gap-4 mb-6 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-black italic text-on-surface">Upcoming Expiries</h3>
                  <div className="flex items-center gap-1.5 bg-surface-container-low rounded-xl p-1">
                    <button 
                      onClick={() => setExpiringViewDate(subMonths(expiringViewDate, 1))} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-white hover:text-on-surface hover:shadow-sm transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[10px] font-black uppercase tracking-widest px-1 min-w-[70px] text-center text-primary">
                      {format(expiringViewDate, 'MMM yy')}
                    </span>
                    <button 
                      onClick={() => setExpiringViewDate(addMonths(expiringViewDate, 1))} 
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-white hover:text-on-surface hover:shadow-sm transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>
                <div className="relative w-full">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchTermExpiring}
                    onChange={(e) => setSearchTermExpiring(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-lowest rounded-2xl text-[11px] font-bold border border-outline-variant/10 focus:border-primary/30 focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/40 uppercase tracking-wider"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar min-h-0">
                {expiringLoading ? (
                  <div className="py-12 flex justify-center">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                ) : (
                  <>
                    {expiringPlans.filter(p => p.name.toLowerCase().includes(searchTermExpiring.toLowerCase())).map((plan, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${plan.isExpired ? 'bg-error-container/10 border-error/10' : 'bg-surface-container-lowest border-outline-variant/5'
                        }`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black ${plan.isExpired ? 'bg-error text-white' : 'bg-surface-container-low text-on-surface'
                            }`}>
                            {plan.initial}
                          </div>
                          <div>
                            <p className="text-[11px] font-black text-on-surface uppercase tracking-tight italic">{plan.name}</p>
                            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Seat #{plan.seat}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[10px] font-black uppercase tracking-widest ${plan.isExpired ? 'text-error' : 'text-primary'}`}>
                            {plan.isExpired ? 'Expired' : `${plan.daysLeft} Days Left`}
                          </p>
                        </div>
                      </div>
                    ))}
                    {expiringPlans.length === 0 && (
                      <div className="py-12 text-center text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-relaxed">
                        No plans expiring in <br/><span className="text-primary">{format(expiringViewDate, 'MMMM yyyy')}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
          </div>

          </div>
        </div>
      </div>

      {/* Activity Feed Table */}
      <div className="card shadow-sm border border-outline-variant/10 bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
        <div className="px-6 lg:px-10 py-6 lg:py-8 border-b border-outline-variant/5 bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">Attendance History</h4>
            <h3 className="text-xl font-black text-on-surface italic">
              {timeframe === 'day' ? format(selectedDate, 'do MMMM') :
                timeframe === 'week' ? `Week of ${format(startOfWeek(selectedDate), 'do MMM')}` :
                  format(selectedDate, 'MMMM yyyy')} Attendance
            </h3>
          </div>
          
          <div className="relative w-full md:w-64 shrink-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchTermHistory}
              onChange={(e) => setSearchTermHistory(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-[11px] font-bold border border-outline-variant/10 focus:border-primary/30 focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-on-surface-variant/40 uppercase tracking-wider"
            />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[420px] custom-scrollbar">
          <table className="w-full text-left relative border-collapse">
            <thead className="sticky top-0 bg-surface-container-lowest z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr className="border-b border-outline-variant/5">
                <th className="px-10 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.3em]">Student Name</th>
                <th className="px-10 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.4em]">Seat Allotted</th>
                <th className="px-10 py-5 text-right text-[9px] font-black text-secondary uppercase tracking-[0.4em]">Check-in Time & Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low/30">
              {attendanceLoading ? (
                <tr><td colSpan={3} className="px-10 py-20 text-center"><div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
              ) : displayLogs.length === 0 ? (
                <tr><td colSpan={3} className="px-10 py-20 text-center text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.3em] italic">No attendance records found</td></tr>
              ) : displayLogs.map((log, i) => (
                <tr key={i} className="group hover:bg-surface-container-low/40 transition-all duration-300">
                  <td className="px-10 py-6">
                    <p className="text-sm font-black text-on-surface leading-none uppercase italic tracking-tight group-hover:text-primary transition-colors">{log.student?.name}</p>
                  </td>
                  <td className="px-10 py-6">
                    <span className="inline-flex items-center px-4 py-1.5 rounded-xl bg-surface-container-low group-hover:bg-primary/10 text-on-surface group-hover:text-primary text-[10px] font-black transition-all">
                      #{log.seat_number || 'N/A'}
                    </span>
                  </td>
                  <td className="px-10 py-6 whitespace-nowrap text-right">
                    <span className="text-[10px] font-black text-on-surface tracking-[0.1em] bg-surface-container-lowest border border-outline-variant/10 px-4 py-2 rounded-xl">
                      {format(new Date(log.timestamp), 'HH:mm • dd MMM')}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
