'use client'

import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Building, Calendar, LayoutGrid, Clock, Users, Database, ShieldAlert, Award, Search } from 'lucide-react'
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
   const [searchTermExpiring, setSearchTermExpiring] = useState('')

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

         // Calculate the Range for this query (based on the current selection)
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

         // 1. Fetch Occupancy (Count only) & Expiring Plans (Range based)
         const [{ count: activeCount }, { data: expiringSubs }] = await Promise.all([
            supabase
               .from('subscriptions')
               .select('*', { count: 'exact', head: true })
               .in('room_id', activeRoomIds)
               .eq('status', 'active'),
            supabase
               .from('subscriptions')
               .select(`
            id, end_date, seat_number, status, room_id, student_id,
            student:profiles!inner(name, email)
          `)
               .in('room_id', activeRoomIds)
               .gte('end_date', rangeStart.toISOString().split('T')[0])
               .lte('end_date', rangeEnd.toISOString().split('T')[0])
               .order('end_date', { ascending: true })
         ])

         setOccupancy({ active: activeCount || 0, total: totalCapacity })

         // Transform Expiring Plans
         const today = startOfDay(new Date())
         const mappedExpiring = (expiringSubs || []).map(sub => {
            const endDate = startOfDay(new Date(sub.end_date))
            const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
            return {
               name: (sub.student as any).name || 'Unknown',
               initial: ((sub.student as any).name || 'U').substring(0, 2).toUpperCase(),
               seat: sub.seat_number,
               expiry: format(endDate, 'dd MMM yyyy'),
               isExpired: endDate < today,
               daysLeft: diffDays
            }
         })
         setExpiringPlans(mappedExpiring)

         // 2. Fetch Attendance for Current View / Filter
         setAttendanceLoading(true)

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
      <div className="flex flex-col min-h-screen bg-background text-on-surface">
         {/* Editorial Header */}
         <header className="w-full sticky top-0 z-50 bg-surface/80 backdrop-blur-xl transition-all">
            <div className="flex justify-between items-end px-8 py-10 max-w-[1600px] mx-auto w-full">
               <div className="flex flex-col">
                  <span className="section-sub">Management Suite</span>
                  <h1 className="section-header">Executive Overview</h1>
               </div>

               <div className="flex items-center gap-6 pb-2">
                  <div className="flex items-center bg-surface-container-low p-1 rounded-[10px]">
                     <select
                        className="bg-transparent px-4 py-2 text-[10px] font-bold text-primary uppercase tracking-[0.06em] outline-none cursor-pointer"
                        value={selectedRoomId}
                        onChange={(e) => setSelectedRoomId(e.target.value)}
                     >
                        <option value="all">All Archive Rooms</option>
                        {rooms.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                     </select>
                  </div>
               </div>
            </div>
         </header>

         <main className="max-w-[1600px] mx-auto px-8 py-6 space-y-12 w-full pb-24">

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">

               {/* LEFT COLUMN: Calendar & Filters */}
               <section className="lg:col-span-5 space-y-10">
                  {/* Editorial Segmented Control */}
                  <div className="p-1.5 bg-surface-container-low rounded-[12px] flex h-12 w-full">
                     {(['day', 'week', 'month'] as Timeframe[]).map((tf) => (
                        <button
                           key={tf}
                           onClick={() => setTimeframe(tf)}
                           className={`relative flex-1 flex items-center justify-center text-[10px] font-bold uppercase tracking-[0.08em] transition-all rounded-[8px] ${timeframe === tf ? 'bg-surface-container-lowest text-primary shadow-ambient font-black' : 'text-on-surface-variant/40 hover:text-on-surface'
                              }`}
                        >
                           {tf}
                        </button>
                     ))}
                  </div>

                  {/* Editorial Calendar Card */}
                  <div className="card shadow-ambient ring-1 ring-outline-variant/5">
                     <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-4">
                           <div className="w-12 h-12 rounded-[12px] bg-primary text-white flex items-center justify-center shadow-ambient">
                              <Calendar size={20} />
                           </div>
                           <h3 className="font-display text-2xl font-bold text-on-surface tracking-tight">{format(viewDate, 'MMMM yyyy')}</h3>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-2.5 rounded-[10px] hover:bg-surface-container transition-all">
                              <ChevronLeft size={20} />
                           </button>
                           <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-2.5 rounded-[10px] hover:bg-surface-container transition-all">
                              <ChevronRight size={20} />
                           </button>
                        </div>
                     </div>

                     <div className="grid grid-cols-7 gap-y-6">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => (
                           <div key={`${day}-${i}`} className="text-center text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.1em] pb-2">{day}</div>
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
                                    className={`w-11 h-11 relative flex items-center justify-center rounded-[12px] text-sm font-semibold transition-all ${isSelected 
                                       ? 'bg-primary text-white shadow-ambient font-bold scale-110' 
                                       : 'text-on-surface hover:bg-surface-container-low'
                                       }`}
                                 >
                                    {i + 1}
                                    {!isSelected && hasLogs && <div className="absolute bottom-2 w-1 h-1 rounded-full bg-primary" />}
                                 </button>
                              </div>
                           )
                        })}
                     </div>
                  </div>
               </section>

               {/* RIGHT COLUMN: Metrics & Fast Lists */}
               <section className="lg:col-span-7 space-y-10">
                  {/* Metrics Stack */}
                  <div className="grid grid-cols-2 gap-8">
                     <div className="card-flat flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Space Occupancy</p>
                        <div className="flex items-baseline gap-2">
                           <span className="text-4xl font-display font-bold text-on-surface">{occupancy.active}</span>
                           <span className="text-sm font-semibold text-on-surface-variant/40">OF {occupancy.total} CAPACITY</span>
                        </div>
                     </div>
                     <div className="card-flat flex flex-col gap-2">
                        <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Total Check-ins</p>
                        <p className="text-4xl font-display font-bold text-on-surface">{filteredCount}</p>
                     </div>
                  </div>

                  {/* Row Lists */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     {/* Expiring Row List */}
                     <div className="card shadow-ambient">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-[0.08em]">
                              Plan Expirations
                           </h4>
                           <div className="relative">
                              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/30" />
                              <input
                                 value={searchTermExpiring}
                                 onChange={(e) => setSearchTermExpiring(e.target.value)}
                                 className="bg-surface-container-low rounded-[8px] pl-9 pr-4 py-2 text-[11px] font-bold w-32 outline-none focus:ring-1 focus:ring-primary/20 transition-all"
                                 placeholder="Search..."
                              />
                           </div>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto space-y-4 pr-1">
                           {expiringPlans.filter(p => p.name.toLowerCase().includes(searchTermExpiring.toLowerCase())).length === 0 ? (
                              <p className="text-[11px] text-on-surface-variant/20 text-center py-12 uppercase font-bold tracking-[0.1em]">No records found</p>
                           ) : expiringPlans.filter(p => p.name.toLowerCase().includes(searchTermExpiring.toLowerCase())).map((plan, i) => (
                              <div key={i} className={`flex items-center justify-between p-4 rounded-[12px] bg-surface-container-low/30 hover:bg-surface-container-low transition-all ${plan.isExpired ? 'ring-1 ring-error/20 bg-error/5' : ''}`}>
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className="w-10 h-10 rounded-[10px] bg-primary/10 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{plan.initial}</div>
                                    <div className="min-w-0">
                                       <p className="text-sm font-bold text-on-surface truncate leading-tight uppercase font-headline italic tracking-tight">{plan.name}</p>
                                       <p className="text-[10px] font-semibold text-on-surface-variant/40 leading-tight mt-1 uppercase tracking-wider">Seat #{plan.seat}</p>
                                    </div>
                                 </div>
                                 <div className="text-right shrink-0">
                                    <p className={`text-[12px] font-bold uppercase tracking-widest ${plan.isExpired ? 'text-error' : 'text-primary'}`}>{plan.daysLeft}D</p>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>

                     {/* Top Members */}
                     <div className="card shadow-ambient">
                        <div className="flex items-center justify-between mb-8">
                           <h4 className="text-[11px] font-bold text-on-surface uppercase tracking-[0.08em]">
                              Frequent Archive Readers
                           </h4>
                        </div>
                        <div className="space-y-4 overflow-y-auto max-h-[240px]">
                           {stars.length === 0 ? (
                              <p className="text-[11px] text-on-surface-variant/20 text-center py-12 uppercase font-bold tracking-[0.1em]">No recent activity</p>
                           ) : stars.map((star, i) => (
                              <div key={i} className="flex items-center justify-between p-4 rounded-[12px] bg-surface-container-low/30 hover:bg-surface-container-low transition-all">
                                 <div className="flex items-center gap-4 min-w-0">
                                    <div className={`w-10 h-10 rounded-[10px] flex items-center justify-center text-[12px] font-bold shrink-0 ${i === 0 ? 'bg-primary text-white shadow-ambient' : 'bg-surface-container text-on-surface-variant'}`}>{star.initials}</div>
                                    <p className="text-sm font-bold text-on-surface truncate leading-tight uppercase font-headline italic tracking-tight">{star.name}</p>
                                 </div>
                                 <div className="flex items-center gap-2 shrink-0">
                                    <span className="text-[12px] font-bold text-primary tracking-widest">{star.days}</span>
                                    <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase">LOGS</span>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                  </div>
               </section>
            </div>

            {/* Attendance Activity Log - Full Width */}
            <section className="space-y-8 pt-6">
               <div className="flex items-end justify-between px-2">
                  <div className="flex flex-col gap-1">
                     <span className="section-sub">Digital Records</span>
                     <h3 className="font-display text-4xl font-bold text-on-surface">Archive Activity Feed</h3>
                  </div>
               </div>

               <div className="card shadow-ambient !p-0 overflow-hidden">
                  <div className="overflow-x-auto">
                     <table className="w-full text-left border-collapse">
                        <thead>
                           <tr className="bg-surface-container-low">
                              <th className="px-10 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Reader Details</th>
                              <th className="px-10 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Timestamp</th>
                              <th className="px-10 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">Verification</th>
                              <th className="px-10 py-5 text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] text-right">Reference</th>
                           </tr>
                        </thead>
                        <tbody className="divide-y divide-surface-container-low">
                           {attendanceLoading ? (
                              <tr>
                                 <td colSpan={4} className="px-10 py-24 text-center">
                                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                                 </td>
                              </tr>
                           ) : attendanceLogs.length === 0 ? (
                              <tr>
                                 <td colSpan={4} className="px-10 py-24 text-center">
                                    <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-[0.1em] opacity-40">No activity recorded for this period</p>
                                 </td>
                              </tr>
                           ) : (
                              attendanceLogs.map((log, i) => (
                                 <tr key={i} className="hover:bg-surface-container-low/20 transition-colors group">
                                    <td className="px-10 py-6">
                                       <div className="flex items-center gap-4">
                                          <div className="w-10 h-10 rounded-[10px] bg-surface-container flex items-center justify-center font-bold text-primary text-[11px] group-hover:bg-primary group-hover:text-white transition-all">
                                             {log.student?.name?.substring(0, 2).toUpperCase()}
                                          </div>
                                          <div className="flex flex-col">
                                             <p className="text-sm font-bold text-on-surface leading-none uppercase font-headline italic tracking-tight">{log.student?.name}</p>
                                             <p className="text-[10px] font-semibold text-on-surface-variant/40 mt-1 uppercase tracking-wider">{log.student?.email}</p>
                                          </div>
                                       </div>
                                    </td>
                                    <td className="px-10 py-6">
                                       <span className="text-[11px] font-bold text-primary tracking-widest">
                                          {format(new Date(log.timestamp), 'HH:mm:ss')}
                                       </span>
                                    </td>
                                    <td className="px-10 py-6">
                                       <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full ring-1 ring-outline-variant/10">
                                          <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                                          <span className="text-[9px] font-bold uppercase tracking-[0.1em] text-on-surface">Authenticated</span>
                                       </div>
                                    </td>
                                    <td className="px-10 py-6 text-right">
                                       <span className="text-[10px] font-bold text-on-surface-variant/20 tracking-widest uppercase">#{log.id.substring(0, 8).toUpperCase()}</span>
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
