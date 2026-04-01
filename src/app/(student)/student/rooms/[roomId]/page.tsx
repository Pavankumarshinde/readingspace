'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/student/QRScanner'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  subDays, 
  isToday, 
  differenceInDays,
  parseISO
} from 'date-fns'
import { 
  ArrowLeft, 
  MapPin, 
  Calendar, 
  Armchair, 
  Flame, 
  Trophy, 
  ChevronLeft, 
  ChevronRight, 
  QrCode,
  ShieldCheck,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react'

export default function RoomDetail({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const supabase = createClient()

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`*, rooms (*)`)
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .single()

      if (subError) throw subError
      setSubscription(subData)
      setRoom(subData.rooms)

      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .order('date', { ascending: false })

      const attendanceLogs = logsData || []
      setLogs(attendanceLogs)
      calculateStreaks(attendanceLogs)

    } catch (err: any) {
      toast.error('Failed to sync room details')
    } finally {
      setLoading(false)
    }
  }

  const calculateStreaks = (attendanceLogs: any[]) => {
    if (attendanceLogs.length === 0) {
      setStreak(0)
      setBestStreak(0)
      return
    }

    const uniqueDates = Array.from(new Set(attendanceLogs.map(l => l.date))).sort().reverse()
    let current = 0
    let best = 0
    let tempStreak = 0

    const today = format(new Date(), 'yyyy-MM-dd')
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd')
    
    const hasToday = uniqueDates.includes(today)
    const hasYesterday = uniqueDates.includes(yesterday)

    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? new Date() : subDays(new Date(), 1)
      
      for (let i = 0; i < uniqueDates.length; i++) {
        const dateStr = format(checkDate, 'yyyy-MM-dd')
        if (uniqueDates.includes(dateStr)) {
          current++
          checkDate = subDays(checkDate, 1)
        } else {
          break
        }
      }
    }
    setStreak(current)

    uniqueDates.forEach((date, index) => {
      if (index === 0) {
        tempStreak = 1
      } else {
        const prevDate = parseISO(uniqueDates[index - 1])
        const currDate = parseISO(date)
        if (differenceInDays(prevDate, currDate) === 1) {
          tempStreak++
        } else {
          best = Math.max(best, tempStreak)
          tempStreak = 1
        }
      }
    })
    setBestStreak(Math.max(best, tempStreak))
  }

  useEffect(() => {
    fetchData()
  }, [roomId])

  const isTodayAttended = logs.some(l => isSameDay(parseISO(l.date), new Date()))

  const startCheckIn = async () => {
    if (room.latitude && room.longitude) {
      if (!navigator.geolocation) {
        toast.error("Geolocation required for check-in")
        return
      }

      setLoading(true)
      try {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => resolve(null),
            { enableHighAccuracy: true, timeout: 5000 }
          )
        })

        if (!position) {
          toast.error("Location verification timed out")
          return
        }

        const { calculateDistance } = await import('@/lib/utils/distance')
        const distance = calculateDistance(
          position.coords.latitude,
          position.coords.longitude,
          room.latitude,
          room.longitude
        )

        if (distance > (room.radius || 200)) {
          toast.error(`Out of range (${Math.round(distance)}m). Move closer to ${room.name}.`, { duration: 5000 })
          return
        }
        
        setShowScanner(true)
      } catch (err) {
        toast.error("Authorization failed")
      } finally {
        setLoading(false)
      }
    } else {
      setShowScanner(true)
    }
  }

  const handleMarkAttendance = async (scannedValue: string) => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          student_id: user.id,
          room_id: roomId,
          marked_by: 'self',
          date: format(new Date(), 'yyyy-MM-dd')
        })

      if (error) {
        if (error.code === '23505') {
          toast.error("Session already logged for today")
        } else {
          throw error
        }
      } else {
        toast.success('Session verified!')
        await fetchData()
      }
    } catch (err: any) {
      toast.error('Sync failed')
    } finally {
      setLoading(false)
      setShowScanner(false)
    }
  }

  if (loading && !room) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 text-slate-400">
         <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
         <span className="text-xs font-bold uppercase tracking-widest opacity-60">Synchronizing workspace...</span>
      </div>
    )
  }

  if (!room) return null

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const isAttended = (day: Date) => logs.some(l => isSameDay(parseISO(l.date), day))
  const expiresIn = differenceInDays(parseISO(subscription.end_date), new Date())

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700 pb-32 px-6">
      {/* Page Header */}
      <header className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex flex-col">
            <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-none">
              {room.name}
            </h2>
            <div className="flex items-center gap-2 mt-2">
               <MapPin size={12} className="text-primary" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{room.description || 'Verified Study Zone'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-8">
        {/* Check-in Primary Action */}
        <section>
          {isTodayAttended ? (
            <div className="card p-8 bg-emerald-50 border-emerald-100 flex flex-col items-center justify-center text-center gap-4">
               <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shadow-inner">
                  <ShieldCheck size={32} />
               </div>
               <div>
                  <h3 className="text-lg font-extrabold text-emerald-800">Attendance Verified</h3>
                  <p className="text-sm font-medium text-emerald-600 mt-1 opacity-80">Your study session for today is correctly logged.</p>
               </div>
            </div>
          ) : (
            <button 
              disabled={loading}
              onClick={startCheckIn}
              className="w-full bg-gradient-to-br from-primary to-indigo-700 text-white p-10 rounded-[2.5rem] shadow-2xl shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all group relative overflow-hidden"
            >
               {/* Decorative */}
               <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 transition-transform group-hover:scale-125" />
               
               <div className="relative z-10 flex flex-col items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20">
                     {loading ? <Loader2 size={32} className="animate-spin" /> : <QrCode size={32} />}
                  </div>
                  <div className="text-center">
                     <span className="text-[11px] font-bold uppercase tracking-[0.3em] opacity-80">Session Auth</span>
                     <h3 className="text-2xl font-extrabold mt-1">Start My Study Session</h3>
                  </div>
               </div>
            </button>
          )}
        </section>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           {/* Subscription Card */}
           <section className="card p-8 bg-white border-slate-100 space-y-8 flex flex-col">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-secondary/10 rounded-2xl flex items-center justify-center text-secondary border border-secondary/5">
                       <Armchair size={24} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assigned Seat</p>
                       <p className="text-lg font-extrabold text-on-surface">Seat {subscription.seat_number}</p>
                    </div>
                 </div>
              </div>
              
              <div className="pt-6 border-t border-slate-50 mt-auto">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/5">
                       <Calendar size={20} />
                    </div>
                    <div>
                       <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Membership</p>
                       <p className="text-xs font-bold text-on-surface">
                          {format(parseISO(subscription.start_date), 'dd MMM')} — {format(parseISO(subscription.end_date), 'dd MMM yyyy')}
                       </p>
                    </div>
                 </div>
              </div>
           </section>

           {/* Metrics Card */}
           <section className="grid grid-cols-1 gap-6">
              <div className="card p-8 bg-white border-slate-100 flex flex-col items-center justify-center text-center group">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Current Streak</p>
                 <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm group-hover:scale-110 transition-transform">
                       <Flame size={28} />
                    </div>
                    <div className="text-left">
                       <p className="text-3xl font-extrabold text-on-surface leading-none">{streak}</p>
                       <p className="text-xs font-bold text-slate-400 uppercase mt-1">Consective Days</p>
                    </div>
                 </div>
              </div>
              <div className="card p-8 bg-white border-slate-100 flex flex-col items-center justify-center text-center group">
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Personal Best</p>
                 <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center text-primary border border-primary/5 shadow-sm group-hover:scale-110 transition-transform">
                       <Trophy size={28} />
                    </div>
                    <div className="text-left">
                       <p className="text-3xl font-extrabold text-on-surface leading-none">{bestStreak}</p>
                       <p className="text-xs font-bold text-slate-400 uppercase mt-1">Record Streak</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>

        {/* Expiring Alert */}
        {expiresIn <= 7 && expiresIn >= 0 && (
          <section className="bg-rose-50 border border-rose-100 p-6 rounded-[2rem] flex items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-extrabold text-rose-800">Membership expiring soon</p>
                <p className="text-xs font-bold text-rose-600 opacity-80">{expiresIn === 0 ? 'Last day of access today' : `Only ${expiresIn} days of access left`}</p>
              </div>
            </div>
            <button className="px-6 py-2.5 bg-white border border-rose-200 text-rose-500 text-xs font-extrabold uppercase tracking-widest rounded-xl hover:bg-rose-500 hover:text-white transition-all shadow-sm">
              Renew Now
            </button>
          </section>
        )}

        {/* Calendar Visualization */}
        <section className="card p-10 bg-white border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-8 px-2">
            <h3 className="font-headline text-xl font-extrabold text-on-surface">
               Attendance History
            </h3>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentMonth(subDays(monthStart, 1))} 
                className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                onClick={() => setCurrentMonth(subDays(monthEnd, -1))} 
                className="w-10 h-10 rounded-xl border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-4">
            {calendarDays.map((day, i) => {
              const attended = isAttended(day)
              const today = isToday(day)
              
              return (
                <div key={i} className="flex items-center justify-center relative">
                  <div className={`w-10 h-10 flex items-center justify-center rounded-2xl text-sm font-bold transition-all ${
                    attended 
                      ? 'bg-secondary text-white shadow-xl shadow-secondary/20 scale-110' 
                      : today 
                        ? 'border-2 border-primary text-primary' 
                        : 'text-slate-400'
                  }`}>
                    {format(day, 'd')}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

      </main>

      {showScanner && (
        <QRScanner 
          onScan={handleMarkAttendance} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  )
}
