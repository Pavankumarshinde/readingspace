'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, Info, Building, Calendar, LayoutGrid, Clock } from 'lucide-react'
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
  isSameMonth, 
  startOfDay, 
  endOfDay,
  eachDayOfInterval,
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
      
      // Calculate Date Range based on timeframe + selectedDate
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

      // Fetch logs for the period
      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select(`*, student:profiles!inner(name, email)`)
        .in('room_id', activeRoomIds)
        .gte('timestamp', rangeStart.toISOString())
        .lte('timestamp', rangeEnd.toISOString())
        .order('timestamp', { ascending: false })

      // Fetch dots for the viewed month heatmap
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

      // Sync Attendance List State
      if (logsData) {
        setAttendanceLogs(logsData)
        setFilteredCount(logsData.length)
        
        // Compute Stars (Consistency)
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
    <div className="flex flex-col min-h-screen bg-surface">
      {/* Dynamic Header */}
      <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 h-16 max-w-7xl mx-auto w-full">
          <div className="flex flex-col">
            <h1 className="font-headline font-black text-xl text-primary tracking-tight leading-none uppercase italic">Today&apos;s Overview</h1>
            <p className="text-[9px] font-black text-outline uppercase tracking-[.3em] mt-1 opacity-50">Managed by {profile?.name || 'Administrator'}</p>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              className="bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-2 text-[10px] font-black text-primary uppercase tracking-widest focus:ring-4 focus:ring-primary/5 transition-all outline-none"
              value={selectedRoomId}
              onChange={(e) => setSelectedRoomId(e.target.value)}
            >
              <option value="all">Refresh</option>
              {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10 space-y-12 w-full pb-40">
        
        {/* Tactical Control Row: Toggle & Calendar */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Calendar & Filters */}
          <div className="lg:col-span-12 space-y-6">
            {/* Full-width Toggle matching User Reference */}
            <div className="relative p-1 bg-surface-container-low rounded-3xl border border-outline-variant/10 flex h-14 md:h-16 shadow-inner w-full group">
               <div 
                 className="absolute top-1 bottom-1 rounded-2xl bg-white shadow-xl shadow-black/5 transition-all duration-500 ease-out z-0"
                 style={{ 
                    left: timeframe === 'day' ? '4px' : timeframe === 'week' ? '33.333%' : '66.666%', 
                    width: 'calc(33.333% - 8px)'
                 }}
               />
               {(['day', 'week', 'month'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`relative z-10 flex-1 flex items-center justify-center font-headline text-xs font-black uppercase tracking-[.25em] transition-colors duration-500 ${
                      timeframe === tf ? 'text-primary' : 'text-outline/50 hover:text-on-surface'
                    }`}
                  >
                    {tf}
                  </button>
               ))}
            </div>

               {/* Minimalist Calendar Card */}
               <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm">
                  <div className="flex items-center justify-between mb-10">
                    <h3 className="font-sans text-xl font-medium text-slate-800">{format(viewDate, 'MMMM yyyy')}</h3>
                    <div className="flex gap-4">
                       <button 
                          onClick={() => {
                             const prev = subMonths(viewDate, 1)
                             setViewDate(prev)
                             const day = selectedDate.getDate()
                             const daysInPrev = getDaysInMonth(prev)
                             setSelectedDate(setDate(prev, day <= daysInPrev ? day : 15))
                          }} 
                          className="text-slate-400 hover:text-slate-800 transition-colors"
                       >
                          <span className="material-symbols-outlined text-xl">chevron_left</span>
                       </button>
                       <button 
                          onClick={() => {
                             const next = addMonths(viewDate, 1)
                             setViewDate(next)
                             const day = selectedDate.getDate()
                             const daysInNext = getDaysInMonth(next)
                             setSelectedDate(setDate(next, day <= daysInNext ? day : 15))
                          }} 
                          className="text-slate-400 hover:text-slate-800 transition-colors"
                       >
                          <span className="material-symbols-outlined text-xl">chevron_right</span>
                       </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-7 gap-y-4">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest pb-4">{day}</div>
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
                            className={`w-8 h-8 relative flex items-center justify-center rounded-lg text-xs font-medium transition-all ${
                              isSelected 
                                ? 'bg-[#004d40] text-white shadow-sm' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {i + 1}
                            {!isSelected && hasLogs && <div className="absolute top-1 right-1 w-1 h-1 rounded-full bg-primary/30" />}
                          </button>
                        </div>
                      )
                    })}
                  </div>
               </div>

               {/* Minimalist Metrics In-line below calendar */}
               <div className="flex items-center gap-12 pt-4 px-2">
                  <div className="flex flex-col gap-1">
                     <p className="text-[8px] font-black text-outline uppercase tracking-[.2em] opacity-40 italic">Students Present</p>
                     <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-headline font-black text-on-surface leading-none">{occupancy.active}</span>
                        <span className="text-[10px] font-black text-primary uppercase tracking-tighter opacity-70">/ {occupancy.total}</span>
                     </div>
                  </div>
                  <div className="w-px h-8 bg-outline-variant/10" />
                  <div className="flex flex-col gap-1">
                     <p className="text-[8px] font-black text-outline uppercase tracking-[.2em] opacity-40 italic">Check-ins Today</p>
                     <p className="text-2xl font-headline font-black text-on-surface leading-none">{filteredCount}</p>
                  </div>
               </div>
            </div>
        </section>

        {/* Secondary Modules: Expiring Plans & Stars */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Expiring Plans - Tactical Box Style */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex items-center gap-3 px-1">
              <span className="material-symbols-outlined text-error" style={{ fontVariationSettings: "'FILL' 1" }}>rule</span>
              <h3 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Expiring Memberships</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
               {expiringPlans.length === 0 ? (
                 <div className="col-span-full h-32 flex flex-col items-center justify-center bg-surface-container-low/30 rounded-3xl border border-outline-variant/10 italic text-[10px] text-outline/40 tracking-widest uppercase">
                    No memberships expiring this month
                 </div>
               ) : expiringPlans.map((plan, i) => (
                 <div key={i} className={`p-5 rounded-2xl border flex flex-col justify-between h-36 transition-all hover:scale-[1.02] ${
                    plan.isExpired ? 'bg-error/5 border-error/20' : 'bg-surface-container-low border-outline-variant/10'
                 }`}>
                    <div className="flex justify-between items-start">
                       <div className="flex flex-col">
                          <h4 className="font-headline font-black text-on-surface text-sm tracking-tight">{plan.name}</h4>
                          <p className="text-[8px] font-black text-outline uppercase tracking-widest opacity-50 mt-1">Seat Assignment: {plan.seat}</p>
                       </div>
                       <div className="px-2 py-1 bg-surface-container-high rounded text-[8px] font-black text-primary uppercase">{plan.initial}</div>
                    </div>
                    <div className="pt-4 border-t border-outline-variant/5 mt-4">
                       <p className={`text-[10px] font-black uppercase tracking-widest ${plan.isExpired ? 'text-error' : 'text-primary'}`}>
                          {plan.isExpired ? 'Status: EXPIRED' : `Valid for ${plan.daysLeft} Cycles`}
                       </p>
                       <p className="text-[8px] font-bold text-outline uppercase opacity-40 mt-1">Terminal Close: {plan.expiry}</p>
                    </div>
                 </div>
               ))}
            </div>
          </div>

          {/* Consistency Trophies */}
          <div className="lg:col-span-4 space-y-6">
            <div className="flex items-center gap-3 px-1">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>military_tech</span>
               <h3 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Most Active Students</h3>
            </div>
            <div className="card p-8 bg-surface-container-low/50 flex flex-col justify-center min-h-[200px]">
               {stars.length === 0 ? (
                  <p className="text-center text-[10px] uppercase font-black tracking-widest text-outline/30 italic">No rankings to synchronize</p>
               ) : (
                  <div className="space-y-6">
                     {stars.map((star, i) => (
                        <div key={i} className="flex items-center justify-between group">
                           <div className="flex items-center gap-4">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] transition-transform group-hover:scale-110 ${
                                 i === 0 ? 'bg-primary text-white' : 'bg-surface-container-high text-outline'
                              }`}>
                                 {star.initials}
                              </div>
                              <div>
                                 <p className="text-xs font-black text-on-surface leading-none">{star.name}</p>
                                 <div className="mt-1 flex gap-0.5">
                                    {[1,2,3,4,5].map(s => (
                                       <span key={s} className={`material-symbols-outlined text-[8px] ${s <= (3 - i) ? 'text-primary fill-icon' : 'text-outline/10'}`}>star</span>
                                    ))}
                                 </div>
                              </div>
                           </div>
                           <p className="text-[10px] font-black text-primary italic uppercase tracking-tighter">{star.days} Visit</p>
                        </div>
                     ))}
                  </div>
               )}
            </div>
          </div>
        </section>

        {/* Integrated Attendance Hub - Tactical Feed */}
        <section className="space-y-8 pt-8">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-4">
                 <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>database</span>
                 <div className="flex flex-col">
                    <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight uppercase italic leading-none">Today&apos;s Activity Log</h3>
                    <p className="text-[10px] font-black text-outline uppercase tracking-[.25em] mt-1 opacity-50 italic">All check-ins on {format(selectedDate, 'dd MMM yyyy')}</p>
                 </div>
              </div>
           </div>

           <div className="bg-surface-container-low/50 rounded-3xl border border-outline-variant/10 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                 <table className="w-full text-left border-collapse">
                    <thead>
                       <tr className="bg-surface shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.05)]">
                          <th className="px-6 py-5 text-[10px] font-black text-outline uppercase tracking-widest">Student Name</th>
                          <th className="px-6 py-5 text-[10px] font-black text-outline uppercase tracking-widest">Check-in Time</th>
                          <th className="px-6 py-5 text-[10px] font-black text-outline uppercase tracking-widest">Entry Status</th>
                          <th className="px-6 py-5 text-[10px] font-black text-outline uppercase tracking-widest text-right">Entry ID</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                       {attendanceLoading ? (
                          <tr>
                             <td colSpan={4} className="px-6 py-20 text-center">
                                <span className="material-symbols-outlined animate-spin text-3xl text-outline/20">progress_activity</span>
                             </td>
                          </tr>
                       ) : attendanceLogs.length === 0 ? (
                          <tr>
                             <td colSpan={4} className="px-6 py-20 text-center italic text-xs text-outline/30 tracking-widest uppercase">Null Records in Active Buffer</td>
                          </tr>
                       ) : (
                          attendanceLogs.map((log, i) => (
                             <tr key={i} className="hover:bg-surface-container-high/50 transition-colors group">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-primary/5 flex items-center justify-center font-black text-primary text-[10px] border border-primary/5 group-hover:scale-105 transition-transform">
                                         {log.student?.name?.substring(0,2).toUpperCase()}
                                      </div>
                                      <div className="flex flex-col">
                                         <p className="text-xs font-black text-on-surface leading-none">{log.student?.name}</p>
                                         <p className="text-[9px] font-bold text-outline mt-1 opacity-50">{log.student?.email}</p>
                                      </div>
                                   </div>
                                </td>
                                <td className="px-6 py-4 font-mono text-[10px] font-black text-primary italic uppercase tracking-tighter">
                                   {format(new Date(log.timestamp), 'HH:mm:ss')}
                                </td>
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                                      <span className="text-[10px] font-black text-secondary tracking-widest uppercase">Entry Allowed</span>
                                   </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                   <span className="text-[10px] font-black text-outline uppercase tracking-widest opacity-40">RSID-{log.id.substring(0,6)}</span>
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
