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
  parseISO,
  getDay,
} from 'date-fns'
import { Loader2 } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { StudentRoomHeader } from '@/components/student/StudentHeader'

export default function RoomDetail({
  params,
}: {
  params: Promise<{ roomId: string }>
}) {
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
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

    const uniqueDates = Array.from(
      new Set(attendanceLogs.map((l) => l.date))
    )
      .sort()
      .reverse()

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

  const startCheckIn = async () => {
    if (room.latitude && room.longitude) {
      if (!navigator.geolocation) {
        toast.error('Geolocation required for check-in')
        return
      }
      setLoading(true)
      try {
        const position = await new Promise<GeolocationPosition | null>(
          (resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => resolve(pos),
              () => resolve(null),
              { enableHighAccuracy: true, timeout: 5000 }
            )
          }
        )
        if (!position) {
          toast.error('Location verification timed out')
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
          toast.error(
            `Out of range (${Math.round(distance)}m). Move closer to ${room.name}.`,
            { duration: 5000 }
          )
          return
        }
        setShowScanner(true)
      } catch {
        toast.error('Authorization failed')
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
      const position = await new Promise<GeolocationPosition | null>(
        (resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 5000 }
          )
        }
      )
      if (!position) {
        toast.error('Location verification required for check-in')
        setLoading(false)
        return
      }
      const res = await fetch('/api/student/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(data.message || 'Session verified!')
        await fetchData()
      } else {
        toast.error(data.error || 'Verification failed')
      }
    } catch {
      toast.error('Sync failed: Network error')
    } finally {
      setLoading(false)
      setShowScanner(false)
    }
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading && !room) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Synchronizing workspace...
        </span>
      </div>
    )
  }

  if (!room) return null

  // ── Calendar helpers ───────────────────────────────────────────────────────
  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const leadingEmpties = getDay(monthStart) // 0=Sun .. 6=Sat
  const isAttended = (day: Date) =>
    logs.some((l) => isSameDay(parseISO(l.date), day))
  const expiresIn = differenceInDays(parseISO(subscription.end_date), new Date())

  return (
    <>
      {/* Mobile-only custom header */}
      <StudentRoomHeader
        roomName={room.name}
        subtitle={room.description || 'Study Zone'}
      />

      <main className="pt-14 pb-28 md:pt-8 md:pb-10 px-4 max-w-lg mx-auto md:max-w-none md:px-8 lg:max-w-5xl xl:max-w-6xl">

        {/* ── Desktop Header (Hidden on Mobile) ────────────────────────── */}
        <div className="hidden md:flex items-center gap-4 mb-8">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              arrow_back
            </span>
          </button>
          <div className="flex flex-col">
            <h1 className="font-headline italic text-3xl font-bold text-on-surface leading-tight">
              {room.name}
            </h1>
            <span className="text-[10px] uppercase tracking-widest text-secondary font-bold mt-1">
              {room.description || 'Study Zone'}
            </span>
          </div>
        </div>

        {/* ── Expiry Warning ─────────────────────────────────────────── */}
        {expiresIn <= 7 && expiresIn >= 0 && (
          <div className="bg-error-container/60 border border-error/20 rounded-lg px-3 py-2.5 flex items-center gap-3 mt-2 md:mt-0 mb-4 md:mb-6">
            <span
              className="material-symbols-outlined text-error"
              style={{ fontSize: '18px' }}
            >
              warning
            </span>
            <p className="text-[10px] font-bold text-error uppercase tracking-wider">
              {expiresIn === 0
                ? 'Membership expires today'
                : `Membership expires in ${expiresIn} day${expiresIn > 1 ? 's' : ''}`}
            </p>
          </div>
        )}

        {/* Responsive Grid: 1 col mobile, 2 cols tablet/desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 lg:gap-12 items-start">
          
          {/* ── LEFT COLUMN (Cards + Gamification) ──────────────────── */}
          <div className="space-y-4 md:space-y-5 flex flex-col">
            
            {/* Manual Entry Card (dark inverse) */}
            <section>
              <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg flex items-center justify-between relative overflow-hidden">
                <div className="flex flex-col gap-0.5">
                  <h2 className="font-headline italic text-lg font-medium leading-tight">
                    Manual Entry
                  </h2>
                  <span className="text-[8px] uppercase tracking-widest opacity-60 font-label">
                    Scan QR at Room Entry
                  </span>
                </div>
                <button
                  disabled={loading}
                  onClick={startCheckIn}
                  className="bg-primary hover:opacity-90 text-white py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: '14px',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    qr_code_scanner
                  </span>
                  <span className="text-[8px] uppercase font-bold tracking-widest">
                    {loading ? 'Verifying...' : 'Scan QR'}
                  </span>
                </button>
              </div>
            </section>

            {/* My Access QR Card */}
            <section>
              <div
                className="bg-surface-container-lowest p-3 rounded-lg flex items-center justify-between border border-outline-variant/10 shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                onClick={() => setShowAccessQR(true)}
              >
                <div className="flex flex-col">
                  <h2 className="font-headline italic text-base text-on-surface font-semibold leading-tight">
                    My Access QR
                  </h2>
                  <p className="text-[8px] text-primary font-bold tracking-widest mt-0.5 uppercase">
                    Show to Manager
                  </p>
                </div>
                {subscription && (
                  <div className="w-10 h-10 bg-surface-container-low p-1 rounded border border-outline-variant/10 flex items-center justify-center">
                    <QRCodeSVG
                      value={JSON.stringify({
                        sid: subscription.id,
                        uid: subscription.student_id,
                        type: 'access_verify',
                      })}
                      size={32}
                      level="L"
                    />
                  </div>
                )}
              </div>
            </section>

            {/* Info Row (Seat + Membership) */}
            <section className="bg-surface-container-low/50 rounded-xl px-4 py-3 flex justify-between items-center border border-outline-variant/5">
              <div className="flex flex-col">
                <span className="text-[8px] uppercase tracking-widest text-secondary/70 font-bold">
                  Assigned Seat
                </span>
                <p className="text-xs font-bold text-on-surface mt-0.5 font-body">
                  Seat {subscription?.seat_number || '—'}
                </p>
              </div>
              <div className="w-px h-6 bg-outline-variant/30" />
              <div className="flex flex-col text-right">
                <span className="text-[8px] uppercase tracking-widest text-secondary/70 font-bold">
                  Membership
                </span>
                <p className="text-xs font-bold text-on-surface mt-0.5 font-body">
                  {format(parseISO(subscription.start_date), 'dd MMM')} —{' '}
                  {format(parseISO(subscription.end_date), 'dd MMM')}
                </p>
              </div>
            </section>

            {/* Gamification Grid */}
            <section className="grid grid-cols-2 gap-3">
              {/* Streak */}
              <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3 border border-outline-variant/10 shadow-sm">
                <div className="bg-primary/10 w-9 h-9 flex items-center justify-center rounded-full shrink-0">
                  <span
                    className="material-symbols-outlined text-primary"
                    style={{
                      fontSize: '18px',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    local_fire_department
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] uppercase tracking-wider text-secondary/60 font-bold">
                    Streak
                  </span>
                  <p className="text-xs font-bold text-on-surface font-body">
                    {streak} {streak === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
              </div>

              {/* Best */}
              <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3 border border-outline-variant/10 shadow-sm">
                <div className="bg-secondary/10 w-9 h-9 flex items-center justify-center rounded-full shrink-0">
                  <span
                    className="material-symbols-outlined text-secondary"
                    style={{
                      fontSize: '18px',
                      fontVariationSettings: "'FILL' 1",
                    }}
                  >
                    emoji_events
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[8px] uppercase tracking-wider text-secondary/60 font-bold">
                    Best
                  </span>
                  <p className="text-xs font-bold text-on-surface font-body">
                    {bestStreak} {bestStreak === 1 ? 'Day' : 'Days'}
                  </p>
                </div>
              </div>
            </section>
          </div>

          {/* ── RIGHT COLUMN (Calendar) ───────────────────────────────── */}
          <div className="md:sticky md:top-6">
            <section>
              <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/10">
                {/* Calendar Header */}
                <div className="flex justify-between items-center mb-6">
                  <h3 className="font-headline italic text-xl font-bold leading-tight">
                    Attendance History
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentMonth(subDays(monthStart, 1))}
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '16px' }}
                      >
                        chevron_left
                      </span>
                    </button>
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1,
                            1
                          )
                        )
                      }
                      className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                    >
                      <span
                        className="material-symbols-outlined"
                        style={{ fontSize: '16px' }}
                      >
                        chevron_right
                      </span>
                    </button>
                  </div>
                </div>

                {/* Day Labels */}
                <div className="grid grid-cols-7 gap-y-4 justify-items-center mb-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
                    <span
                      key={d}
                      className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest"
                    >
                      {d}
                    </span>
                  ))}

                  {/* Leading empty cells */}
                  {Array.from({ length: leadingEmpties }).map((_, i) => (
                    <div key={`empty-${i}`} className="w-8 h-8 sm:w-10 sm:h-10" />
                  ))}

                  {/* Day cells */}
                  {calendarDays.map((day, i) => {
                    const attended = isAttended(day)
                    const today = isToday(day)

                    return (
                      <div
                        key={i}
                        className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${
                          attended
                            ? 'bg-tertiary text-white shadow-sm'
                            : today
                            ? 'border-2 border-primary text-primary font-extrabold'
                            : 'text-on-surface/40 hover:bg-surface-container-low cursor-default'
                        }`}
                      >
                        {format(day, 'd')}
                      </div>
                    )
                  })}
                </div>

                {/* Month label */}
                <div className="mt-6 flex justify-center border-t border-outline-variant/10 pt-4">
                  <span className="text-[10px] uppercase tracking-widest text-secondary/60 font-bold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>

      {/* ── Access QR Modal ─────────────────────────────────────────────── */}
      {showAccessQR && subscription && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in duration-300">
          <div
            className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
            onClick={() => setShowAccessQR(false)}
          />
          <div className="relative w-full max-w-xs bg-surface-container-lowest rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-300 p-6 flex flex-col items-center gap-5">
            <div className="text-center space-y-1">
              <h3 className="font-headline italic text-xl font-bold text-on-surface">
                Identity Access Pass
              </h3>
              <p className="text-[9px] font-bold text-secondary/60 uppercase tracking-widest">
                Present to manager for verification
              </p>
            </div>
            <div className="p-4 bg-white rounded-xl border border-outline-variant/10">
              <QRCodeSVG
                value={JSON.stringify({
                  sid: subscription.id,
                  uid: subscription.student_id,
                  type: 'access_verify',
                })}
                size={180}
                level="H"
                includeMargin
              />
            </div>
            <div className="w-full bg-surface-container-low rounded-lg px-3 py-2 flex justify-between items-center text-xs">
              <span className="font-bold text-secondary/60 uppercase tracking-widest text-[9px]">
                Room
              </span>
              <span className="font-bold text-on-surface">{room.name}</span>
            </div>
            <button
              onClick={() => setShowAccessQR(false)}
              className="w-full py-2 bg-surface-container-low text-on-surface text-[10px] font-bold rounded-lg hover:bg-surface-container transition-colors uppercase tracking-widest"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── QR Scanner Overlay ──────────────────────────────────────────── */}
      {showScanner && (
        <QRScanner
          onScan={handleMarkAttendance}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
