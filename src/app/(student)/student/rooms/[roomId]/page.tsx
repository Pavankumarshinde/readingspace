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
  isYesterday,
  differenceInDays,
  parseISO
} from 'date-fns'


export default function RoomDetail({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params)
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [subscription, setSubscription] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
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

      // 1. Fetch Profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      // 2. Fetch Subscription and Room
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`
          *,
          rooms (*)
        `)
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .single()

      if (subError) throw subError
      setSubscription(subData)
      setRoom(subData.rooms)

      // 3. Fetch All Attendance Logs for this room (to calculate streaks)
      const { data: logsData } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .order('date', { ascending: false })

      const attendanceLogs = logsData || []
      setLogs(attendanceLogs)

      // 4. Calculate Streak
      calculateStreaks(attendanceLogs)

    } catch (err: any) {
      toast.error('Failed to load room details')
      console.error(err)
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

    // Current Streak logic
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

    // Best Streak logic
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
        toast.error("Geolocation is required for attendance")
        return
      }

      setLoading(true)
      try {
        const position = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            (err) => {
              console.error(err)
              resolve(null)
            },
            { enableHighAccuracy: true, timeout: 5000 }
          )
        })

        if (!position) {
          toast.error("Failed to verify location. Please enable GPS and allow permissions.")
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
          toast.error(`Out of range! You are ${Math.round(distance)}m away. Required: ${room.radius || 200}m`, { duration: 5000 })
          return
        }
        
        setShowScanner(true)
      } catch (err) {
        toast.error("Location verification failed")
      } finally {
        setLoading(false)
      }
    } else {
      toast.success("Geofence disabled. Initializing scanner...", { icon: '️🔓', duration: 3000 })
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
          toast.error("You've already checked in today!")
        } else {
          throw error
        }
      } else {
        toast.success('Attendance recorded successfully!')
        await fetchData()
      }
    } catch (err: any) {
      toast.error('Check-in failed')
      console.error(err)
    } finally {
      setLoading(false)
      setShowScanner(false)
    }
  }

  if (loading && !room) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
         <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    )
  }

  if (!room) return null

  // Calendar logic
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  
  const isAttended = (day: Date) => logs.some(l => isSameDay(parseISO(l.date), day))
  const isPastGoal = (day: Date) => !isAttended(day) && day < new Date() && !isToday(day)

  const expiresIn = differenceInDays(parseISO(subscription.end_date), new Date())

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sub-Header with Back Button */}
      <section className="mb-6 flex items-center gap-4 px-1">
        <button 
          onClick={() => router.back()}
          className="p-2 rounded-full hover:bg-surface-container-low transition-colors text-primary"
        >
          <span className="material-symbols-outlined font-bold">arrow_back</span>
        </button>
        <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface truncate">
          {room.name}
        </h2>
      </section>

      <main className="w-full space-y-8">
        {/* Room Header & Location */}
        <section className="px-2">
          <div className="flex items-center text-secondary gap-1.5 mb-1">
            <span className="material-symbols-outlined text-sm font-bold">location_on</span>
            <span className="text-[10px] font-bold uppercase tracking-widest">{room.description || 'Main Hall'}</span>
          </div>
          <p className="text-on-surface-variant text-xs leading-relaxed max-w-sm">
            Welcome to your dedicated study zone. Maintain silence and focus.
          </p>
        </section>

        {/* Subscription Info Card */}
        <section className="bg-surface border border-outline-variant/30 p-6 rounded-2xl relative overflow-hidden">
           <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-primary border border-outline-variant/10">
                    <span className="material-symbols-outlined text-xl">chair</span>
                 </div>
                 <div>
                    <p className="text-[9px] text-outline uppercase tracking-widest mb-0.5">Your Seat</p>
                    <p className="font-mono text-sm font-bold text-primary">{subscription.seat_number}</p>
                 </div>
              </div>
           </div>
           
           <div className="h-px bg-outline-variant/10 w-full mb-4"></div>

           <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-secondary border border-outline-variant/10">
                 <span className="material-symbols-outlined text-xl">calendar_today</span>
              </div>
              <div>
                 <p className="text-[9px] text-outline uppercase tracking-widest mb-0.5">Membership Valid From – To</p>
                 <p className="font-mono text-[10px] font-medium text-on-surface">
                    {format(parseISO(subscription.start_date), 'dd MMM')} — {format(parseISO(subscription.end_date), 'dd MMM yyyy')}
                 </p>
              </div>
           </div>
        </section>

        {/* Attendance Action */}
        <section className="px-2">
          {isTodayAttended ? (
            <div className="bg-surface-container-highest/20 border border-secondary/20 py-4 rounded-xl w-full flex items-center justify-center gap-3 text-secondary shadow-inner">
               <span className="material-symbols-outlined text-lg fill-icon">check_circle</span>
               <span className="text-xs font-bold uppercase tracking-widest">You&apos;ve already checked in today</span>
            </div>
          ) : (
            <button 
              disabled={loading}
              onClick={startCheckIn}
              className="bg-primary text-on-primary py-4 rounded-xl w-full font-bold text-xs uppercase tracking-widest hover:opacity-95 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {loading ? (
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                 <>
                    <span className="material-symbols-outlined text-lg">qr_code_scanner</span>
                    <span>Mark My Attendance</span>
                 </>
              )}
            </button>
          )}
        </section>

        {/* Expiring Banner */}
        {expiresIn <= 7 && expiresIn >= 0 && (
          <section className="bg-error/5 border border-error/20 p-4 rounded-2xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-error">timer</span>
              <div>
                <p className="text-[9px] font-bold text-error uppercase tracking-widest">Plan expiring soon</p>
                <p className="text-xs font-semibold text-on-surface">{expiresIn === 0 ? 'Today' : `In ${expiresIn} days`}</p>
              </div>
            </div>
            <button className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-primary border border-primary/20 rounded-lg bg-white">
              Renew
            </button>
          </section>
        )}

        {/* Streak Stats (Minimalized) */}
        <section className="grid grid-cols-2 gap-4">
           <div className="bg-surface border border-outline-variant/30 p-5 rounded-2xl flex flex-col items-center">
              <p className="text-[9px] text-outline uppercase tracking-widest mb-1.5">Study Streak</p>
              <div className="flex items-center gap-2">
                 <span className="material-symbols-outlined text-secondary text-xl font-bold">local_fire_department</span>
                 <p className="font-headline text-lg font-bold text-on-surface">{streak} <span className="text-xs font-medium text-outline">Days</span></p>
              </div>
           </div>
           <div className="bg-surface border border-outline-variant/30 p-5 rounded-2xl flex flex-col items-center">
              <p className="text-[9px] text-outline uppercase tracking-widest mb-1.5">Best Streak</p>
              <p className="font-headline text-lg font-bold text-on-surface">{bestStreak} <span className="text-xs font-medium text-outline">Days</span></p>
           </div>
        </section>

        {/* Calendar Widget (Simplified) */}
        <section className="bg-surface border border-outline-variant/30 p-6 rounded-2xl">
          <div className="flex items-center justify-between mb-8 px-1">
            <h3 className="font-headline text-base font-semibold text-on-surface">
               {format(currentMonth, 'MMMM yyyy')}
            </h3>
            <div className="flex gap-1">
              <button onClick={() => setCurrentMonth(subDays(monthStart, 1))} className="p-1 hover:bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-outline text-lg">chevron_left</span>
              </button>
              <button onClick={() => setCurrentMonth(subDays(monthEnd, -1))} className="p-1 hover:bg-surface-container-low rounded-lg">
                <span className="material-symbols-outlined text-outline text-lg">chevron_right</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[9px] font-bold text-outline/40 mb-4 uppercase tracking-widest">
            <div>S</div><div>M</div><div>T</div><div>W</div><div>T</div><div>F</div><div>S</div>
          </div>

          <div className="grid grid-cols-7 gap-y-3">
            {calendarDays.map((day, i) => {
              const attended = isAttended(day)
              const missed = isPastGoal(day)
              const today = isToday(day)
              
              return (
                <div key={i} className="relative flex items-center justify-center py-1">
                  <span className={`font-mono text-[11px] font-medium relative z-10 ${
                    attended ? 'text-white' : today ? 'text-primary font-bold' : 'text-on-surface'
                  }`}>
                    {format(day, 'd')}
                  </span>
                  {attended && <div className="absolute w-7 h-7 bg-secondary rounded-lg shadow-sm" />}
                  {missed && <div className="absolute w-1 h-1 bottom-0 bg-error/40 rounded-full" />}
                  {today && !attended && <div className="absolute w-7 h-7 border border-primary/30 rounded-lg" />}
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
