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
  Printer,
  ShieldCheck,
  UserCircle,
  AlertCircle,
  Loader2,
  Lock
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

export default function RoomDetail({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAccessQR, setShowAccessQR] = useState(false)
  
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
      // 1. Get current position for server-side verification
      const position = await new Promise<GeolocationPosition | null>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos),
          (err) => resolve(null),
          { enableHighAccuracy: true, timeout: 5000 }
        )
      })

      if (!position) {
         toast.error("Location verification required for check-in")
         setLoading(false)
         return
      }

      // 2. Call secure API for geofence verification and logging
      const res = await fetch('/api/student/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(data.message || 'Session verified!')
        await fetchData()
      } else {
        toast.error(data.error || 'Verification failed')
      }
    } catch (err: any) {
      toast.error('Sync failed: Network error')
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
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-700 pb-20 px-6">
      {/* Page Header */}
      <header className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 transition-all"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex flex-col">
            <h2 className="font-headline text-lg font-extrabold text-on-surface tracking-tight leading-none">
               {room.name}
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
               <MapPin size={10} className="text-primary" />
               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{room.description || 'Verified Study Zone'}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="space-y-8">
        {/* Check-in Primary Action */}
        <section>
            <div className="flex flex-col md:flex-row gap-4">
              <button 
                disabled={loading}
                onClick={startCheckIn}
                className="flex-[2] bg-gradient-to-br from-primary to-indigo-700 text-white p-6 rounded-2xl shadow-2xl shadow-primary/30 hover:scale-[1.01] active:scale-95 transition-all group relative overflow-hidden text-left"
              >
                 <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl -mr-24 -mt-24 transition-transform group-hover:scale-125" />
                 <div className="relative z-10 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                       {loading ? <Loader2 size={24} className="animate-spin" /> : <QrCode size={24} />}
                    </div>
                    <div className="flex flex-col">
                       <span className="text-[9px] font-bold uppercase tracking-[0.3em] opacity-80">Manual Entry</span>
                       <h3 className="text-lg font-extrabold mt-0.5">Scan Room QR</h3>
                    </div>
                 </div>
              </button>

              <button 
                onClick={() => setShowAccessQR(true)}
                className="flex-1 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm hover:border-primary/40 hover:bg-slate-50 transition-all group flex flex-col items-center justify-center text-center gap-2"
              >
                 <div className="w-12 h-12 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary border border-secondary/5 group-hover:scale-110 transition-transform">
                    <UserCircle size={24} />
                 </div>
                 <div className="flex flex-col">
                    <h3 className="text-[14px] font-extrabold text-on-surface leading-tight">My Access QR</h3>
                    <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest opacity-60">Show to Manager</p>
                 </div>
              </button>
            </div>
        </section>

        {/* Access QR Modal */}
        {showAccessQR && subscription && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
             <div className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm" onClick={() => setShowAccessQR(false)} />
             <div className="relative w-full max-w-sm bg-white rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] overflow-hidden animate-in zoom-in-95 duration-300">
                <div className="p-8 flex flex-col items-center text-center gap-8">
                   <div className="space-y-2">
                      <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mx-auto">
                         <UserCircle size={32} />
                      </div>
                      <h3 className="font-headline text-xl font-black text-on-surface uppercase tracking-tight">Identity Access Pass</h3>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Present this code at the library terminal<br />to verify your study session.</p>
                   </div>

                   <div className="p-6 bg-white rounded-[2rem] border-4 border-slate-50 shadow-2xl shadow-primary/5">
                      <QRCodeSVG 
                         value={JSON.stringify({
                            sid: subscription.id,
                            uid: subscription.student_id,
                            type: 'access_verify'
                         })} 
                         size={200}
                         level="H"
                         includeMargin={true}
                      />
                   </div>

                   <div className="w-full space-y-4">
                      <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex justify-between items-center text-xs">
                         <span className="font-bold text-slate-400 uppercase tracking-widest">Linked Room</span>
                         <span className="font-black text-on-surface">{room.name}</span>
                      </div>
                      
                      <button 
                         onClick={() => setShowAccessQR(false)}
                         className="w-full py-4.5 bg-slate-100 font-black text-slate-500 rounded-2xl hover:bg-slate-200 transition-all uppercase tracking-widest text-[10px]"
                      >
                         Dismiss
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           {/* Subscription Card */}
           <section className="card p-6 bg-white border-slate-100 space-y-6 flex flex-col">
              <div className="flex items-center justify-between">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-secondary/10 rounded-xl flex items-center justify-center text-secondary border border-secondary/5">
                       <Armchair size={20} />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Assigned Seat</p>
                       <p className="text-base font-extrabold text-on-surface">Seat {subscription.seat_number}</p>
                    </div>
                 </div>
              </div>
              
              <div className="pt-4 border-t border-slate-50 mt-auto">
                 <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary border border-primary/5">
                       <Calendar size={18} />
                    </div>
                    <div>
                       <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Active Membership</p>
                       <p className="text-[11px] font-bold text-on-surface">
                          {format(parseISO(subscription.start_date), 'dd MMM')} — {format(parseISO(subscription.end_date), 'dd MMM yyyy')}
                       </p>
                    </div>
                 </div>
              </div>
           </section>

           {/* Metrics Card */}
           <section className="grid grid-cols-1 gap-4">
              <div className="card p-6 bg-white border-slate-100 flex flex-col items-center justify-center text-center group">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Current Streak</p>
                 <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 border border-amber-100 shadow-sm group-hover:scale-105 transition-transform">
                       <Flame size={22} />
                    </div>
                    <div className="text-left">
                       <p className="text-xl font-extrabold text-on-surface leading-none">{streak}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Days</p>
                    </div>
                 </div>
              </div>
              <div className="card p-6 bg-white border-slate-100 flex flex-col items-center justify-center text-center group">
                 <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-3">Personal Best</p>
                 <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-primary/5 rounded-xl flex items-center justify-center text-primary border border-primary/5 shadow-sm group-hover:scale-105 transition-transform">
                       <Trophy size={22} />
                    </div>
                    <div className="text-left">
                       <p className="text-xl font-extrabold text-on-surface leading-none">{bestStreak}</p>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Days</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>

        {/* Expiring Alert */}
        {expiresIn <= 7 && expiresIn >= 0 && (
          <section className="bg-rose-50 border border-rose-100 p-5 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-200">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-rose-800">Expiring soon</p>
                <p className="text-[10px] font-bold text-rose-600 opacity-80">{expiresIn === 0 ? 'Last day today' : `${expiresIn} days left`}</p>
              </div>
            </div>
            <button className="px-4 py-1.5 bg-white border border-rose-200 text-rose-500 text-[10px] font-extrabold uppercase tracking-widest rounded-lg hover:bg-rose-500 hover:text-white transition-all shadow-sm">
              Renew
            </button>
          </section>
        )}

        {/* Calendar Visualization */}
        <section className="card p-6 bg-white border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center justify-between mb-6 px-1">
            <h3 className="font-headline text-lg font-extrabold text-on-surface">
               Attendance History
            </h3>
            <div className="flex gap-1.5">
              <button 
                onClick={() => setCurrentMonth(subDays(monthStart, 1))} 
                className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <ChevronLeft size={16} />
              </button>
              <button 
                onClick={() => setCurrentMonth(subDays(monthEnd, -1))} 
                className="w-8 h-8 rounded-lg border border-slate-100 flex items-center justify-center text-slate-400 hover:text-primary hover:bg-primary/5 transition-all"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-y-3">
            {calendarDays.map((day, i) => {
              const attended = isAttended(day)
              const today = isToday(day)
              
              return (
                <div key={i} className="flex items-center justify-center relative">
                  <div className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-bold transition-all ${
                    attended 
                      ? 'bg-secondary text-white shadow-xl shadow-secondary/20 scale-105' 
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
