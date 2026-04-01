'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Building, Calendar, LayoutGrid, Clock, Users, Database, ShieldAlert, Award } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  isSameDay, 
  startOfDay, 
  endOfDay,
  getDaysInMonth,
  getDay,
  setDate
} from 'date-fns'

type Timeframe = 'day' | 'week' | 'month'

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [rooms, setRooms] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [selectedRoomId, setSelectedRoomId] = useState<string>('all')
  const [timeframe, setTimeframe] = useState<Timeframe>('day')
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [viewDate, setViewDate] = useState<Date>(new Date()) // Month being viewed in calendar
  
  // Dashboard Metrics
  const [occupancy, setOccupancy] = useState({ active: 0, total: 0 })
  const [expiringPlans, setExpiringPlans] = useState<any[]>([])
  const [stars, setStars] = useState<any[]>([])
  const [heatmap, setHeatmap] = useState<Record<number, number>>({})
  const [filteredCount, setFilteredCount] = useState(0)
  
  // Consolidated Attendance State
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: dbProfile }, { data: dbRooms }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('rooms').select('id, name, total_seats').eq('manager_id', user.id)
      ])

      if (dbProfile) setProfile(dbProfile)
      if (dbRooms) setRooms(dbRooms)

      const activeRooms = selectedRoomId === 'all' 
        ? dbRooms || [] 
        : (dbRooms || []).filter(r => r.id === selectedRoomId)

      const activeRoomIds = activeRooms.map(r => r.id)
      const totalCapacity = activeRooms.reduce((sum, r) => sum + r.total_seats, 0)
      
      if (activeRoomIds.length === 0) {
         setOccupancy({ active: 0, total: 0 })
         setExpiringPlans([])
         setAttendanceLogs([])
         setLoading(false)
         return
      }

      // 1. Fetch Active Subscriptions for Occupancy & Expiring Plans
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select(`
          id, end_date, seat_number, status, room_id, student_id,
          student:profiles!inner(name, email)
        `)
        .in('room_id', activeRoomIds)
        .eq('status', 'active')

      const activeCount = activeSubs ? activeSubs.length : 0
      setOccupancy({ active: activeCount, total: totalCapacity })

      // Expiring Plans Calculation (7 days lookahead)
      const todayDate = startOfDay(new Date())
      const in7Days = startOfDay(new Date())
      in7Days.setDate(todayDate.getDate() + 7)
      
      const expiring = (activeSubs || []).filter(sub => {
        const endDate = startOfDay(new Date(sub.end_date))
        return endDate <= in7Days
      }).map(sub => {
        const endDate = startOfDay(new Date(sub.end_date))
        const diffDays = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 3600 * 24))
        return {
          name: (sub.student as any).name || 'Unknown',
          initial: ((sub.student as any).name || 'U').substring(0, 2).toUpperCase(),
          seat: sub.seat_number,
          expiry: format(endDate, 'dd MMM yyyy'),
          isExpired: endDate < todayDate,
          daysLeft: diffDays
        }
      }).sort((a,b) => a.daysLeft - b.daysLeft)
      setExpiringPlans(expiring)

      // 2. Fetch Attendance for Current View / Filter
      setAttendanceLoading(true)
      
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

      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select(`*, student:profiles!inner(name, email)`)
        .in('room_id', activeRoomIds)
        .gte('timestamp', rangeStart.toISOString())
        .lte('timestamp', rangeEnd.toISOString())
        .order('timestamp', { ascending: false })

      const monthStart = startOfMonth(viewDate)
      const monthEnd = endOfMonth(viewDate)
      const { data: monthDots } = await supabase
        .from('attendance_logs')
        .select('timestamp')
        .in('room_id', activeRoomIds)
        .gte('timestamp', monthStart.toISOString())
        .lte('timestamp', monthEnd.toISOString())

      const heatMapData: Record<number, number> = {}
      monthDots?.forEach(log => {
        const d = new Date(log.timestamp).getDate()
        heatMapData[d] = (heatMapData[d] || 0) + 1
      })
      setHeatmap(heatMapData)

      if (logsData) {
        setAttendanceLogs(logsData)
        setFilteredCount(logsData.length)
        
        const freq: Record<string, { count: number, name: string }> = {}
        logsData.forEach(log => {
           if (!freq[log.student_id]) freq[log.student_id] = { count: 0, name: (log.student as any).name || 'Unknown' }
           freq[log.student_id].count++
        })
        const sorted = Object.values(freq)
          .sort((a, b) => b.count - a.count)
          .slice(0, 3)
          .map((s, i) => ({
             rank: i + 1,
             name: s.name,
             initials: s.name.substring(0, 2).toUpperCase(),
             days: s.count
          }))
        setStars(sorted)
      }
      
      setAttendanceLoading(false)
      setLoading(false)
    }

    fetchDashboardData()
  }, [selectedRoomId, timeframe, selectedDate, viewDate])

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Prism Header */}
      <header className="w-full sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="flex justify-between items-center px-8 h-18 max-w-7xl mx-auto w-full">
          <div className="flex flex-col">
            <h1 className="font-headline font-extrabold text-2xl text-on-surface tracking-tight leading-none">Dashboard</h1>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-80">Administering Reading Rooms</p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl border border-slate-200">
              <select 
                className="bg-transparent px-4 py-2 text-xs font-bold text-primary uppercase tracking-wider outline-none cursor-pointer"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="all">All Rooms</option>
                {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-8 py-10 space-y-12 w-full pb-40">
        
        {/* Analytics & Calendar Overview */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
          
          <div className="lg:col-span-12 space-y-8">
            {/* Professional Segmented Control */}
            <div className="p-1.5 bg-white rounded-3xl border border-slate-200 flex h-16 shadow-sm w-full">
               {(['day', 'week', 'month'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`relative flex-1 flex items-center justify-center text-xs font-extrabold uppercase tracking-widest transition-all rounded-[1.25rem] ${
                       timeframe === tf ? 'bg-primary text-white shadow-xl shadow-primary/20' : 'text-slate-400 hover:text-on-surface hover:bg-slate-50'
                    }`}
                  >
                    {tf}
                  </button>
               ))}
            </div>

               {/* Modern Calendar Card */}
               <div className="card p-10 bg-white shadow-xl shadow-slate-200/50">
                  <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                          <Calendar size={24} />
                       </div>
                       <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">{format(viewDate, 'MMMM yyyy')}</h3>
                    </div>
                    <div className="flex gap-2">
                       <button 
                          onClick={() => {
                             const prev = subMonths(viewDate, 1)
                             setViewDate(prev)
                             const day = selectedDate.getDate()
                             const daysInPrev = getDaysInMonth(prev)
                             setSelectedDate(setDate(prev, day <= daysInPrev ? day : 15))
                          }} 
                          className="btn-ghost"
                       >
                           <ChevronLeft size={22} />
                       </button>
                       <button 
                          onClick={() => {
                             const next = addMonths(viewDate, 1)
                             setViewDate(next)
                             const day = selectedDate.getDate()
                             const daysInNext = getDaysInMonth(next)
                             setSelectedDate(setDate(next, day <= daysInNext ? day : 15))
                          }} 
                          className="btn-ghost"
                       >
                           <ChevronRight size={22} />
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-6">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                      <div key={`${day}-${i}`} className="text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest pb-4">{day}</div>
                    ))}
                    {Array.from({ length: getDay(startOfMonth(viewDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
                      const isSelected = isSameDay(date, selectedDate)
                      const hasLogs = !!heatmap[i + 1]
                      return (
                        <div key={i} className="flex justify-center">
                          <button
                            onClick={() => setSelectedDate(date)}
                            className={`w-10 h-10 relative flex items-center justify-center rounded-2xl text-sm font-bold transition-all ${
                              isSelected                                 ? 'bg-primary text-white shadow-2xl shadow-primary/30 scale-110' 
                                 : 'text-slate-600 hover:bg-slate-100 hover:text-on-surface'
                            }`}
                          >
                            {i + 1}
                            {!isSelected && hasLogs && <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-primary" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
               </div>

               {/* Quick Info Grid */}
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="card p-8 flex flex-col gap-1 border-primary/10 bg-gradient-to-br from-white to-primary/5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Global Occupancy</p>
                     <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-3xl font-extrabold text-on-surface leading-none">{occupancy.active}</span>
                        <span className="text-sm font-bold text-primary opacity-80">/ {occupancy.total} seats</span>
                     </div>
                  </div>
                  <div className="card p-8 flex flex-col gap-1 border-secondary/10 bg-gradient-to-br from-white to-secondary/5">
                     <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Today&apos;s Check-ins</p>
                     <p className="text-3xl font-extrabold text-on-surface leading-none mt-2">{filteredCount}</p>
                  </div>
               </div>
            </div>
        </section>

        {/* Secondary Modules */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          
          {/* Expiring Memberships */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-4 px-1">
              <div className="w-10 h-10 rounded-xl bg-error/10 flex items-center justify-center text-error border border-error/5">
                <ShieldAlert size={20} />
              </div>
              <h3 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Expiring Memberships</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {expiringPlans.length === 0 ? (
                 <div className="col-span-full h-40 flex flex-col items-center justify-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60">No pending renewals this period</p>
                 </div>
               ) : expiringPlans.map((plan, i) => (
                 <div key={i} className={`p-6 rounded-[2rem] border shadow-sm transition-all hover:scale-[1.02] flex flex-col justify-between min-h-[160px] ${
                    plan.isExpired ? 'bg-red-50 border-red-100 shadow-red-100' : 'bg-white border-slate-200'
                 }`}>
                    <div className="flex justify-between items-start">
                       <div>
                          <h4 className="font-extrabold text-on-surface text-base">{plan.name}</h4>
                          <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm">chair_alt</span> 
                            SEAT {plan.seat}
                          </p>
                       </div>
                       <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-extrabold text-primary border border-primary/5">{plan.initial}</div>
                    </div>
                    <div className="pt-6 border-t border-slate-100 mt-6 flex items-center justify-between">
                       <span className={`text-[11px] font-extrabold uppercase tracking-wider ${plan.isExpired ? 'text-red-500' : 'text-primary'}`}>
                          {plan.isExpired ? 'Plan Expired' : `${plan.daysLeft} days remaining`}
                       </span>
                       <p className="text-[10px] font-bold text-slate-400 opacity-60">Ends {plan.expiry}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Activity Leaders */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-4 px-1">
               <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                 <Award size={20} />
               </div>
               <h3 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Active Students</h3>
            </div>
            <div className="card p-8 bg-white border border-slate-100 min-h-[200px] flex flex-col shadow-xl shadow-slate-200/40">
               {stars.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-slate-300">
                    <Users size={32} className="opacity-20 mb-4" />
                    <p className="text-xs font-bold uppercase tracking-widest opacity-40">No activity data</p>
                  </div>
               ) : (
                  <div className="space-y-8">
                     {stars.map((star, i) => (
                        <div key={i} className="flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-extrabold text-xs transition-all shadow-md group-hover:scale-110 ${
                                 i === 0 ? 'bg-primary text-white shadow-primary/20' : 'bg-slate-100 text-slate-600'
                              }`}>
                                 {star.initials}
                              </div>
                              <div>
                                 <p className="text-sm font-extrabold text-on-surface leading-tight">{star.name}</p>
                                 <div className="mt-1.5 flex gap-1">
                                    {[1,2,3,4,5].map(s => (
                                       <div key={s} className={`w-1 h-1 rounded-full ${s <= (3 - i) ? 'bg-primary' : 'bg-slate-200'}`} />
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <p className="text-xs font-extrabold text-primary">{star.days} Sessions</p>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </section>

        {/* Attendance Activity Log */}
        <section className="space-y-8 pt-8">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/25">
                    <Database size={22} />
                 </div>
                 <div className="flex flex-col">
                    <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-none">Activity Feed</h3>
                    <p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                       Live check-ins for {format(selectedDate, 'MMMM dd, yyyy')}
                    </p>
                 </div>
              </div>
           </div>

           <div className="bg-white rounded-[2.5rem] border border-slate-200/60 overflow-hidden shadow-2xl shadow-slate-200/50">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-slate-50/50">
                          <th className="px-8 py-6 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Student</th>
                          <th className="px-8 py-6 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Logged Time</th>
                          <th className="px-8 py-6 text-xs font-extrabold text-slate-400 uppercase tracking-widest">Status</th>
                          <th className="px-8 py-6 text-xs font-extrabold text-slate-400 uppercase tracking-widest text-right">Reference</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {attendanceLoading ? (
                          <tr>
                             <td colSpan={4} className="px-8 py-24 text-center">
                                <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                             </td>
                          </tr>
                       ) : attendanceLogs.length === 0 ? (
                          <tr>
                             <td colSpan={4} className="px-8 py-24 text-center">
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60">No activity recorded for this period</p>
                             </td>
                          </tr>
                       ) : (
                          attendanceLogs.map((log, i) => (
                             <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-8 py-5">
                                   <div className="flex items-center gap-4">
                                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-extrabold text-primary text-[11px] group-hover:bg-primary group-hover:text-white transition-all">
                                         {log.student?.name?.substring(0,2).toUpperCase()}
                                      </div>
                                      <div className="flex flex-col">
                                         <p className="text-sm font-extrabold text-on-surface leading-none">{log.student?.name}</p>
                                         <p className="text-[11px] font-medium text-slate-400 mt-1.5">{log.student?.email}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-8 py-5 font-mono text-xs font-extrabold text-primary">
                                   {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </td>
                                <td className="px-8 py-5">
                                   <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      <span className="text-[10px] font-extrabold uppercase tracking-widest">Authenticated</span>
                                   </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                   <span className="text-[11px] font-bold text-slate-400 opacity-40">#{log.id.substring(0,8).toUpperCase()}</span>
                                </td>
                             </tr>
                          ))
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </section>
      </main>
    </div>
  )
}
