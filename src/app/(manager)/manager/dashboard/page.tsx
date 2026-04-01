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
  getDay
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
  const [heatmap, setHeatmap] = useState<Record<number, number>>({}) // indicators for the month
  const [filteredCount, setFilteredCount] = useState(0) // total for the cards


  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Parallel Fetch Profile & Rooms
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
         setStars([])
         setHeatmap({})
         setLoading(false)
         return
      }

      // 1. Fetch Active Subscriptions
      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select(`
          id, end_date, seat_number, status, room_id,
          student:profiles!inner(name)
        `)
        .in('room_id', activeRoomIds)
        .eq('status', 'active')

      const activeCount = activeSubs ? activeSubs.length : 0
      setOccupancy({ active: activeCount, total: totalCapacity })

      // Expiring Plans Calculation
      const today = new Date()
      today.setHours(0,0,0,0)
      const in7Days = new Date(today)
      in7Days.setDate(today.getDate() + 7)
      
      const expiring = (activeSubs || []).filter(sub => {
        const endDate = new Date(sub.end_date)
        return endDate <= in7Days && endDate >= today
      }).map(sub => {
        const endDate = new Date(sub.end_date)
        const diffDays = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
        return {
          name: (sub.student as any).name || 'Unknown',
          initial: ((sub.student as any).name || 'U').substring(0, 2).toUpperCase(),
          seat: sub.seat_number,
          expiry: endDate.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }),
          daysLeft: `${diffDays}d`
        }
      })
      setExpiringPlans(expiring)

      // 2. Fetch Attendance Logs for the VIEWED MONTH (to show heatmap dots)
      const monthStart = startOfMonth(viewDate)
      const monthEnd = endOfMonth(viewDate)
      
      const { data: monthLogs } = await supabase
        .from('attendance_logs')
        .select(`student_id, timestamp, student:profiles!inner(name)`)
        .in('room_id', activeRoomIds)
        .gte('timestamp', monthStart.toISOString())
        .lte('timestamp', monthEnd.toISOString())

      if (monthLogs) {
         // Determine filters for cards based on selectedDate and timeframe
         let filterStart: Date;
         let filterEnd: Date;
         
         if (timeframe === 'day') {
           filterStart = startOfDay(selectedDate)
           filterEnd = endOfDay(selectedDate)
         } else if (timeframe === 'week') {
           filterStart = startOfWeek(selectedDate)
           filterEnd = endOfWeek(selectedDate)
         } else {
           filterStart = startOfMonth(selectedDate)
           filterEnd = endOfMonth(selectedDate)
         }

         const filteredLogs = monthLogs.filter(log => {
           const logDate = new Date(log.timestamp)
           return logDate >= filterStart && logDate <= filterEnd
         })
         
         setFilteredCount(filteredLogs.length)

         // Stars freq (from filtered logs)
         const freq: Record<string, { count: number, name: string }> = {}
         filteredLogs.forEach(log => {
            if (!freq[log.student_id]) freq[log.student_id] = { count: 0, name: (log.student as any).name || 'Unknown' }
            freq[log.student_id].count++
         })

         const sorted = Object.values(freq).sort((a, b) => b.count - a.count).slice(0, 3)
         setStars(sorted.map((s, i) => ({
            rank: i + 1,
            name: s.name,
            initials: s.name.substring(0, 2).toUpperCase(),
            days: s.count
         })))

         // Heatmap (for dots in the viewed month)
         const heatMapData: Record<number, number> = {}
         monthLogs.forEach(log => {
           const logDate = new Date(log.timestamp)
           if (isSameMonth(logDate, viewDate)) {
             const d = logDate.getDate()
             heatMapData[d] = (heatMapData[d] || 0) + 1
           }
         })
         setHeatmap(heatMapData)
      } else {
        setStars([])
        setHeatmap({})
        setFilteredCount(0)
      }
      setLoading(false)
    }

    fetchDashboardData()
  }, [selectedRoomId, timeframe, selectedDate, viewDate])

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar - Only show branding on mobile */}
      <header className="w-full top-0 sticky z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 h-14 md:h-16 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2 md:hidden">
            <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            <h1 className="font-headline font-black text-base text-primary tracking-tight">ReadingSpace</h1>
          </div>
          
          <div className="flex items-center gap-4 ml-auto">
            <div className="hidden sm:flex items-center bg-surface-container-low rounded-xl pr-3 pl-1 border border-outline-variant/10 h-9">
                <div className="w-7 h-7 flex-center text-primary bg-surface-container-lowest rounded-lg m-1 shadow-sm">
                   <Building size={12} />
                </div>
                <select 
                  className="bg-transparent text-[10px] font-black uppercase font-headline p-2 focus:outline-none focus:ring-0 min-w-[120px] appearance-none cursor-pointer"
                  value={selectedRoomId}
                  onChange={(e) => setSelectedRoomId(e.target.value)}
                >
                  <option value="all">Global (All Rooms)</option>
                  {rooms.map(r => (
                     <option key={r.id} value={r.id}>{r.name}</option>
                  ))}
                </select>
            </div>

            <div className="w-8 h-8 rounded-full border border-outline-variant/30 overflow-hidden shadow-sm hover:scale-105 transition-transform cursor-pointer">
               <div className="w-full h-full bg-primary-fixed text-primary flex items-center justify-center font-black text-[10px] uppercase italic">
                 {profile?.name?.substring(0,2).toUpperCase() || 'RS'}
               </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-6 pt-0 pb-40 space-y-6 md:space-y-8 w-full">
        {/* Timeframe Picker Segmented Control */}
        <section className="flex flex-col sm:flex-row items-center justify-between gap-4">
           <div className="flex items-center p-1.5 bg-surface-container-low border border-outline-variant/10 rounded-2xl w-full sm:w-fit shadow-sm">
              {(['day', 'week', 'month'] as Timeframe[]).map((tf) => (
                <button
                  key={tf}
                  onClick={() => setTimeframe(tf)}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-3 rounded-xl text-[12px] font-black uppercase tracking-widest transition-all duration-300 ${
                    timeframe === tf 
                      ? 'bg-primary text-white shadow-lg shadow-primary/20 transform scale-[1.02]' 
                      : 'text-outline hover:bg-surface-container-high'
                  }`}
                >
                  {tf}
                </button>
              ))}
           </div>

           <div className="md:hidden w-full">
              <select 
                className="w-full bg-surface-container-low border border-outline-variant/10 text-[11px] font-black uppercase tracking-widest p-3 rounded-2xl focus:outline-none"
                value={selectedRoomId}
                onChange={(e) => setSelectedRoomId(e.target.value)}
              >
                <option value="all">Global (All Rooms)</option>
                {rooms.map(r => (
                   <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
           </div>
        </section>

        {loading ? (
           <div className="flex justify-center items-center py-32 text-outline">
              <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
              Synchronizing with Space...
           </div>
        ) : (
          <>
            {/* Metrics Overview */}
            <section className="grid grid-cols-1 gap-6">
              <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm flex flex-col justify-between overflow-hidden relative border border-outline-variant/10">
                <div className="z-10">
                  <h2 className="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[.2em] mb-2 opacity-60">
                    Live Space Utilization
                  </h2>
                  <div className="flex items-baseline gap-2 mb-6">
                    <span className="text-5xl font-black text-primary tracking-tighter italic">{occupancy.active}</span>
                    <span className="text-xl text-outline font-bold opacity-60">/ {occupancy.total} Capacity</span>
                  </div>
                  <div className="space-y-4 max-w-sm">
                    <div className="w-full bg-surface-container-high h-3 rounded-full overflow-hidden shadow-inner">
                      <div 
                        className="bg-primary h-full rounded-full transition-all duration-1000"
                        style={{ width: `${occupancy.total === 0 ? 0 : Math.min((occupancy.active / occupancy.total) * 100, 100)}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60 flex items-center gap-2">
                       <Info size={12} /> Real-time active student count
                    </p>
                  </div>
                </div>
                <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
                  <span className="material-symbols-outlined text-[100px]">groups</span>
                </div>
              </div>
            </section>

            {/* Calendar and Attendance Cards */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
               {/* Calendar Segment */}
               <div className="bg-surface-container-lowest p-8 rounded-[32px] border border-outline-variant/10 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <button 
                      onClick={() => setViewDate(subMonths(viewDate, 1))}
                      className="w-10 h-10 rounded-full flex-center hover:bg-surface-container-low transition-colors border border-outline-variant/10"
                    >
                      <ChevronLeft size={18} className="text-primary" />
                    </button>
                    
                    <div className="text-center">
                      <p className="text-[12px] font-black italic text-primary/40 uppercase tracking-widest">{format(viewDate, 'yyyy')}</p>
                      <h3 className="font-headline text-3xl font-black text-primary tracking-tight">{format(viewDate, 'MMMM')}</h3>
                    </div>

                    <button 
                      onClick={() => setViewDate(addMonths(viewDate, 1))}
                      className="w-10 h-10 rounded-full flex-center hover:bg-surface-container-low transition-colors border border-outline-variant/10"
                    >
                      <ChevronRight size={18} className="text-primary" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                      <div key={`${day}-${i}`} className="h-10 flex-center text-[11px] font-black text-outline/40 uppercase tracking-widest">
                        {day}
                      </div>
                    ))}
                    {Array.from({ length: getDay(startOfMonth(viewDate)) }).map((_, i) => (
                      <div key={`empty-${i}`} className="aspect-square" />
                    ))}
                    {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                      const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), i + 1)
                      const isSelected = isSameDay(date, selectedDate)
                      const hasLogs = !!heatmap[i + 1] && isSameMonth(date, viewDate) // simplification for now

                      return (
                        <button
                          key={i}
                          onClick={() => setSelectedDate(date)}
                          className={`aspect-square relative flex-center rounded-2xl transition-all duration-200 group ${
                            isSelected 
                              ? 'bg-primary text-white shadow-xl shadow-primary/30 scale-110 z-10' 
                              : 'hover:bg-surface-container-high transition-transform'
                          }`}
                        >
                          <span className={`text-sm font-black ${isSelected ? 'scale-110' : 'text-on-surface'}`}>
                            {i + 1}
                          </span>
                          {!isSelected && hasLogs && (
                            <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-secondary shadow-sm" />
                          )}
                        </button>
                      )
                    })}
                  </div>
               </div>

               {/* Summary Card Segment */}
               <div className="bg-surface-container-low p-8 rounded-[32px] border border-outline-variant/10 h-full flex flex-col justify-center min-h-[400px]">
                  <div className="text-center space-y-6">
                    <div>
                      <h2 className="font-headline text-3xl text-primary font-black italic tracking-tighter uppercase mb-1">
                        {timeframe === 'month' ? 'Monthly' : timeframe === 'week' ? 'Weekly' : 'Daily'} Analytics
                      </h2>
                      <p className="text-[11px] text-outline font-black uppercase tracking-[.25em] opacity-60">
                        Showing results for {format(selectedDate, timeframe === 'day' ? 'MMM dd, yyyy' : timeframe === 'week' ? "'week of' MMM dd" : 'MMMM yyyy')}
                      </p>
                    </div>

                    <div className="relative inline-block">
                       <div className="bg-primary/5 p-12 rounded-full border-2 border-primary/5 animate-pulse-slow">
                          <h4 className="text-6xl font-black text-primary italic mb-1 tracking-tighter">
                            {filteredCount}
                          </h4>
                          <p className="text-[11px] font-black uppercase text-primary/60 tracking-widest">
                            Check-ins
                          </p>
                       </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                       <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 shadow-sm">
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Avg/Day</p>
                          <p className="text-xl font-black text-primary italic">
                            {(filteredCount / (timeframe === 'month' ? 30 : timeframe === 'week' ? 7 : 1)).toFixed(1)}
                          </p>
                       </div>
                       <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10 shadow-sm">
                          <p className="text-[10px] font-black text-outline uppercase tracking-widest mb-1">Trend</p>
                          <p className="text-xl font-black text-secondary italic">Stable</p>
                       </div>
                    </div>
                  </div>
               </div>
            </section>

            {/* Consistency Stars & Expiring Plans */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="font-headline text-2xl font-black text-primary italic lowercase tracking-tight">Consistency Stars</h3>
                <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10 min-h-[300px] flex flex-col justify-center">
                  {stars.length === 0 ? (
                     <div className="text-center opacity-60 font-bold text-sm italic py-20 px-4">"Success is the sum of small efforts, repeated day in and day out." <br/> <span className="text-[10px] uppercase opacity-60">Not enough data for this {timeframe} yet.</span></div>
                  ) : (
                    <div className="flex items-end justify-center gap-4 w-full max-w-[320px] mx-auto">
                      {stars[1] && (
                        <div className="flex-1 flex flex-col items-center group">
                          <div className="w-12 h-12 rounded-full border-2 border-outline-variant/20 overflow-hidden mb-3 shadow-inner">
                            <div className="w-full h-full bg-surface-container-high flex-center font-bold text-primary text-xs">{stars[1].initials}</div>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-t-xl h-16 flex flex-col items-center justify-center px-1">
                            <span className="text-xl font-black text-primary">2</span>
                            <p className="text-[9px] font-black text-primary/80 truncate w-full text-center px-2">{stars[1].name}</p>
                            <p className="text-[8px] text-outline font-black">{stars[1].days} Check-ins</p>
                          </div>
                        </div>
                      )}
                      {stars[0] && (
                        <div className="flex-1 flex flex-col items-center group">
                          <div className="w-16 h-16 rounded-full border-4 border-primary overflow-hidden mb-3 shadow-2xl relative">
                            <div className="w-full h-full bg-primary flex-center font-black text-white text-lg">{stars[0].initials}</div>
                          </div>
                          <div className="w-full bg-primary rounded-t-2xl h-28 flex flex-col items-center justify-center px-1 shadow-2xl">
                            <span className="text-2xl font-black text-white italic">1</span>
                            <p className="text-[10px] font-black text-white truncate w-full text-center px-2">{stars[0].name}</p>
                            <p className="text-[8px] text-white/70 font-black uppercase tracking-widest">{stars[0].days} Check-ins</p>
                          </div>
                        </div>
                      )}
                      {stars[2] && (
                        <div className="flex-1 flex flex-col items-center group">
                          <div className="w-12 h-12 rounded-full border-2 border-outline-variant/20 overflow-hidden mb-3 shadow-inner">
                            <div className="w-full h-full bg-surface-container-high flex-center font-bold text-primary text-xs">{stars[2].initials}</div>
                          </div>
                          <div className="w-full bg-surface-container-high rounded-t-xl h-12 flex flex-col items-center justify-center px-1">
                            <span className="text-lg font-black text-primary">3</span>
                            <p className="text-[9px] font-black text-primary/80 truncate w-full text-center px-2">{stars[2].name}</p>
                            <p className="text-[8px] text-outline font-black">{stars[2].days} Check-ins</p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <h3 className="font-headline text-2xl font-black text-primary italic lowercase tracking-tight">Expiring Plans</h3>
                <div className="bg-surface-container-lowest rounded-3xl overflow-hidden shadow-sm border border-outline-variant/10">
                  <div className="divide-y divide-outline-variant/5">
                    {expiringPlans.length === 0 ? (
                       <div className="p-10 text-center opacity-60 font-bold text-sm italic">All subscriptions are up to date! 🎉</div>
                    ) : expiringPlans.map((plan, i) => (
                      <div key={i} className="p-5 flex items-center justify-between hover:bg-surface-container-low transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-surface-container-high flex-center font-black text-primary text-xs">{plan.initial}</div>
                          <div>
                            <p className="font-black text-primary text-sm">{plan.name}</p>
                            <p className="text-[9px] text-outline font-black uppercase tracking-widest opacity-60">Seat {plan.seat}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-black ${plan.daysLeft === '0d' ? 'text-error' : 'text-secondary'}`}>{plan.daysLeft === '0d' ? 'EXPIRED' : `IN ${plan.daysLeft}`}</p>
                          <p className="text-[9px] text-outline font-bold uppercase tracking-widest opacity-40">{plan.expiry}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Link href="/manager/students">
                    <button className="w-full py-5 text-primary font-black text-[11px] uppercase tracking-widest bg-surface-container-low hover:bg-surface-container-high transition-all flex items-center justify-center gap-2 group">
                      View Directory <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
