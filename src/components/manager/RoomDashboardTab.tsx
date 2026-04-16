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

type Timeframe = 'day' | 'week' | 'month'

export default function RoomDashboardTab({ roomId, roomName }: { roomId: string, roomName: string }) {
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<Timeframe>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewDate, setViewDate] = useState<Date>(new Date())

  // Navigation metrics
  const [occupancy, setOccupancy] = useState({ active: 0, total: 0 })
  const [expiringPlans, setExpiringPlans] = useState<any[]>([])
  const [stars, setStars] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<Record<number, number>>({})
  const [filteredCount, setFilteredCount] = useState(0)
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [searchTermExpiring, setSearchTermExpiring] = useState('')

  // Real-time logs for the room
  const realtimeLogs = useRealtimeAttendance(roomId)
  const attendanceLogs = timeframe === 'day' && isSameDay(selectedDate, new Date()) 
    ? realtimeLogs 
    : [] // We'll still fetch historical data in useEffect
  
  const [historicalLogs, setHistoricalLogs] = useState<any[]>([])
  const displayLogs = attendanceLogs.length > 0 ? attendanceLogs : historicalLogs

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      const supabase = createClient()

      const { data: roomData } = await supabase.from('rooms').select('total_seats').eq('id', roomId).single()
      const totalCapacity = roomData?.total_seats || 0

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

      const [{ count: activeCount }, { data: expiringSubs }] = await Promise.all([
        supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('room_id', roomId).eq('status', 'active'),
        supabase.from('subscriptions').select(`id, end_date, seat_number, status, room_id, student_id, student:profiles!inner(name, email)`).eq('room_id', roomId).gte('end_date', rangeStart.toISOString().split('T')[0]).lte('end_date', rangeEnd.toISOString().split('T')[0]).order('end_date', { ascending: true })
      ])

      setOccupancy({ active: activeCount || 0, total: totalCapacity })

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
        setHistoricalLogs(logsData)
        setFilteredCount(logsData.length)

        const freq: Record<string, { count: number, name: string }> = {}
        logsData.forEach(log => {
          if (!freq[log.student_id]) freq[log.student_id] = { count: 0, name: (log.student as any).name || 'Unknown' }
          freq[log.student_id].count++
        })
        const sorted = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 3).map((s, i) => ({
          name: s.name, initials: s.name.substring(0, 2).toUpperCase(), days: s.count
        }))
        setStars(sorted)
      }

      setAttendanceLoading(false)
      setLoading(false)
    }
    fetchDashboardData()
  }, [roomId, timeframe, selectedDate, viewDate])

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
        {/* Left Col: Filters & Calendar */}
        <div className="space-y-6">
          <div className="p-1.5 bg-surface-container-low rounded-xl flex h-12 w-full">
            {(['day', 'week', 'month'] as Timeframe[]).map((tf) => (
              <button
                key={tf} onClick={() => setTimeframe(tf)}
                className={`flex-1 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${
                  timeframe === tf ? 'bg-surface-container-lowest text-primary shadow-sm font-black' : 'text-on-surface-variant/40 hover:text-on-surface'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="card shadow-sm border border-outline-variant/10 p-6 rounded-2xl bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-headline text-lg font-bold text-on-surface tracking-tight">{format(viewDate, 'MMMM yyyy')}</h3>
              <div className="flex gap-2">
                <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2 rounded-lg hover:bg-surface-container transition-all"><ChevronLeft size={18} /></button>
                <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2 rounded-lg hover:bg-surface-container transition-all"><ChevronRight size={18} /></button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-y-4">
              {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day, i) => <div key={i} className="text-center text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest pb-1">{day}</div>)}
              {Array.from({ length: getDay(startOfMonth(viewDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
                const isSelected = isSameDay(date, selectedDate)
                const hasLogs = !!heatmap[i + 1]
                return (
                  <div key={i} className="flex justify-center">
                    <button onClick={() => setSelectedDate(date)} className={`w-9 h-9 relative flex items-center justify-center rounded-xl text-xs font-semibold transition-all ${isSelected ? 'bg-primary text-white shadow-sm font-bold scale-105' : 'text-on-surface hover:bg-surface-container-low'}`}>
                      {i + 1}
                      {!isSelected && hasLogs && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary" />}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="p-5 bg-white rounded-2xl border border-outline-variant/10 flex flex-col gap-1">
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Active Occupancy</p>
                <div className="flex items-baseline gap-1 mt-1">
                   <span className="text-3xl font-headline font-bold text-on-surface">{occupancy.active}</span>
                   <span className="text-xs font-bold text-on-surface-variant/40">/{occupancy.total}</span>
                </div>
             </div>
             <div className="p-5 bg-white rounded-2xl border border-outline-variant/10 flex flex-col gap-1">
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest">Total Check-ins</p>
                <div className="flex items-baseline gap-1 mt-1">
                   <span className="text-3xl font-headline font-bold text-on-surface">{filteredCount}</span>
                </div>
             </div>
          </div>
        </div>

        {/* Right Col: Lists */}
        <div className="space-y-6">
          <div className="card shadow-sm border border-outline-variant/10 bg-white p-5 rounded-2xl">
            <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest mb-4">Plan Expirations</h4>
            <div className="max-h-[200px] overflow-y-auto space-y-2 pr-1">
               {expiringPlans.length === 0 ? (
                 <p className="text-[10px] text-on-surface-variant/30 text-center py-6 uppercase font-bold tracking-widest">No expirations</p>
               ) : expiringPlans.map((plan, i) => (
                 <div key={i} className={`flex items-center justify-between p-3 rounded-xl bg-surface-container-low/50 transition-all ${plan.isExpired ? 'ring-1 ring-error/20 bg-error/5' : ''}`}>
                   <div className="flex items-center gap-3 min-w-0">
                     <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{plan.initial}</div>
                     <div className="min-w-0">
                       <p className="text-xs font-bold text-on-surface truncate uppercase italic tracking-tight">{plan.name}</p>
                       <p className="text-[9px] font-bold text-on-surface-variant/40 mt-0.5 uppercase tracking-wider">Seat {plan.seat}</p>
                     </div>
                   </div>
                   <div className="text-right shrink-0">
                     <p className={`text-[10px] font-bold uppercase tracking-widest ${plan.isExpired ? 'text-error' : 'text-primary'}`}>{plan.daysLeft}D {plan.isExpired && ' AGO'}</p>
                   </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="card shadow-sm border border-outline-variant/10 bg-white p-5 rounded-2xl">
            <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest mb-4">Top Attendees</h4>
             <div className="space-y-2">
               {stars.length === 0 ? (
                 <p className="text-[10px] text-on-surface-variant/30 text-center py-6 uppercase font-bold tracking-widest">No activity</p>
               ) : stars.map((star, i) => (
                 <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface-container-low/50">
                   <div className="flex items-center gap-3 min-w-0">
                     <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold shrink-0 ${i === 0 ? 'bg-primary text-white shadow-sm' : 'bg-surface-container text-on-surface-variant'}`}>{star.initials}</div>
                     <p className="text-xs font-bold text-on-surface truncate uppercase italic tracking-tight">{star.name}</p>
                   </div>
                   <div className="flex items-center gap-1 shrink-0">
                     <span className="text-[11px] font-bold text-primary">{star.days}</span>
                     <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase">Logs</span>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      </div>

      <div className="card shadow-sm border border-outline-variant/10 bg-white rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-outline-variant/5 bg-surface-container-lowest">
           <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-widest">Activity Feed</h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <tbody className="divide-y divide-surface-container-low">
              {attendanceLoading ? (
                 <tr><td colSpan={4} className="px-6 py-12 text-center"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div></td></tr>
              ) : displayLogs.length === 0 ? (
                 <tr><td colSpan={4} className="px-6 py-12 text-center text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">No activity</td></tr>
              ) : displayLogs.map((log, i) => (
                 <tr key={i} className="hover:bg-surface-container-low/20 transition-colors">
                   <td className="px-6 py-4">
                     <div className="flex flex-col">
                       <p className="text-sm font-bold text-on-surface leading-none uppercase italic tracking-tight">{log.student?.name}</p>
                       <p className="text-[9px] font-bold text-on-surface-variant/40 mt-1 uppercase tracking-wider">{log.student?.email}</p>
                     </div>
                   </td>
                   <td className="px-6 py-4 whitespace-nowrap">
                     <span className="text-[10px] font-bold text-primary tracking-widest">{format(new Date(log.timestamp), 'HH:mm:ss')}</span>
                   </td>
                   <td className="px-6 py-4 text-right">
                     <span className="text-[9px] font-bold text-on-surface-variant/20 tracking-widest uppercase">#{log.id.substring(0, 8)}</span>
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
