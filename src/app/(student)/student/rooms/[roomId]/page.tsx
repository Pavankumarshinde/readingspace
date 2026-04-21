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
import { Loader2, Wifi } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import { StudentRoomHeader } from '@/components/student/StudentHeader'
import RoomChat from '@/components/shared/RoomChat'
import { useRoomPresence } from '@/hooks/useRoomPresence'

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
  const [activeTab, setActiveTab] = useState<'overview' | 'chats'>('overview')
  const [unreadCount, setUnreadCount] = useState(0)
  const [studentId, setStudentId] = useState<string>('')
  const [studentName, setStudentName] = useState<string>('Student')
  const [subscription, setSubscription] = useState<any>(null)
  const [logs, setLogs] = useState<any[]>([])
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [showAccessQR, setShowAccessQR] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)

  const supabase = createClient()

  // ── Sync Unread Count ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === 'chats') {
      setUnreadCount(0)
    }
  }, [activeTab])

  useEffect(() => {
    const channel = supabase
      .channel('chat_notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'room_messages', filter: `room_id=eq.${roomId}` },
        () => {
          if (activeTab !== 'chats') {
            setUnreadCount(prev => prev + 1)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, activeTab, supabase])

  const { onlineCount, onlineUsers, isOnline } = useRoomPresence(roomId, { id: studentId, name: studentName })

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
      setStudentId(user.id)

      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select(`*, rooms (*), student:profiles(id, name, email, phone)`)
        .eq('room_id', roomId)
        .eq('student_id', user.id)
        .single()

      if (subError) throw subError
      setSubscription(subData)
      setRoom(subData.rooms)
      if (subData.student?.name) setStudentName(subData.student.name)

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
              { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
          const accuracy = position.coords.accuracy ? ` (accuracy: ±${Math.round(position.coords.accuracy)}m)` : ''
          toast.error(
            `Out of range (${Math.round(distance)}m).${accuracy} Please move closer to ${room.name}.`,
            { duration: 6000 }
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
    // Expected format: roomId|vVersion
    const parts = scannedValue.split('|')
    const scannedRoomId = parts[0]
    const versionStr = parts[1] // e.g. "v0", "v1"
    const scannedVersion = versionStr && versionStr.startsWith('v') ? parseInt(versionStr.substring(1)) : 0

    if (scannedRoomId !== roomId) {
      toast.error('Invalid QR: This code does not belong to this room.')
      return
    }

    setLoading(true)
    try {
      const position = await new Promise<GeolocationPosition | null>(
        (resolve) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos),
            () => resolve(null),
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
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
          version: scannedVersion
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
            <div className="flex flex-col">
              <h1 className="font-headline italic text-3xl font-bold text-on-surface leading-tight">
                {room.name}
              </h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  {room.description || 'Study Zone'}
                </span>
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 animate-in fade-in slide-in-from-left-2 transition-all">
                  <Wifi size={10} className="animate-pulse" />
                  <span className="text-[9px] font-black uppercase tracking-widest">{onlineCount} Online</span>
                </div>
              </div>
            </div>
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

        {/* ── Segmented Control ────────────────────────────────────── */}
        <div className="flex p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full mb-6 max-w-sm mx-auto md:mx-0">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'overview' 
                ? 'bg-surface-container-lowest text-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${
              activeTab === 'chats' 
                ? 'bg-surface-container-lowest text-primary shadow-sm' 
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Live Chat
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error text-white text-[9px] font-black flex items-center justify-center rounded-full px-1 shadow-lg shadow-error/20 scale-110 animate-in zoom-in duration-200">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {unreadCount === 0 && (
              <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.4)]"></span>
            )}
          </button>
        </div>

        {/* Responsive Grid: 1 col mobile, 2 cols tablet/desktop */}
        {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 lg:gap-12 items-start animate-in fade-in duration-300">
          
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
                        studentId: subscription.student_id,
                        type: 'access_verify',
                        version: subscription.qr_version || 0
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
        )}

        {activeTab === 'chats' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <RoomChat 
              roomId={room.id} 
              currentUserId={studentId} 
              currentUserName={studentName} 
              currentUserType="student" 
              onlineUsers={onlineUsers}
              isOnline={isOnline}
            />
          </div>
        )}
      </main>

      {/* Identity Access Pass Modal */}
      {showAccessQR && subscription && (
        <div className="fixed inset-0 z-[100] bg-on-surface/60 backdrop-blur-md flex items-center justify-center p-4">
          <div className="printable-pass relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col items-center p-8">
            <div className="printable-pass-content flex flex-col items-center w-full">
              <div className="text-center space-y-2 mb-6">
                <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-4 py-1.5 rounded-full">Official Pass</span>
                <h3 className="font-headline italic text-2xl font-black text-on-surface pt-2">
                  Identity Access Pass
                </h3>
                <p className="text-[11px] font-bold text-secondary/40 uppercase tracking-widest">
                  {(subscription.student as any)?.name}
                </p>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 mb-6 print:border-none print:bg-white text-on-surface">
                <QRCodeSVG
                  value={JSON.stringify({
                    studentId: subscription.student_id,
                    type: 'access_verify',
                    version: subscription.qr_version || 0
                  })}
                  size={180}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="w-full space-y-3">
                <div className="flex flex-col gap-3 p-4 bg-surface-container-low/30 rounded-2xl border border-outline-variant/10">
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-secondary/50 uppercase tracking-wider">Reading Name</span>
                    <span className="text-on-surface text-right truncate pl-4 italic">{room.name}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-secondary/50 uppercase tracking-wider">Seat Number</span>
                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-sm">#{subscription.seat_number}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-secondary/50 uppercase tracking-wider">Email</span>
                    <span className="text-on-surface truncate pl-4">{(subscription.student as any)?.email || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-bold">
                    <span className="text-secondary/50 uppercase tracking-wider">Phone</span>
                    <span className="text-on-surface">{(subscription.student as any)?.phone || 'N/A'}</span>
                  </div>
                </div>
              </div>

              <p className="mt-6 text-[9px] font-bold text-on-surface-variant/30 text-center uppercase tracking-[0.2em] leading-relaxed">
                Scan at room entrance for validation.<br/>
                Valid membership required.
              </p>
            </div>

            <div className="w-full mt-6 flex gap-2 print:hidden">
              <button
                onClick={() => setShowAccessQR(false)}
                className="flex-1 py-3.5 bg-surface-container-low text-on-surface text-[11px] font-black rounded-xl hover:bg-surface-container transition-all uppercase tracking-widest"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3.5 bg-primary text-white text-[11px] font-black rounded-xl hover:opacity-90 shadow-lg shadow-primary/20 transition-all uppercase tracking-widest flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined italic" style={{ fontSize: '18px' }}>print</span>
                Print Pass
              </button>
            </div>
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
