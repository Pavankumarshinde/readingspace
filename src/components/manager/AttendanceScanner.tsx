'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/library'
import { X, Camera, RefreshCw, CheckCircle2, UserCircle, QrCode, Search, User, Filter, CreditCard } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

interface AttendanceScannerProps {
  roomId: string
  roomName: string
  onClose: () => void
}

export default function AttendanceScanner({ roomId, roomName, onClose }: AttendanceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [lastScanned, setLastScanned] = useState<any>(null)
  const scannedRef = useRef(false)
  const supabase = createClient()

  // New features
  const [viewMode, setViewMode] = useState<'scan' | 'search'>('scan')
  const [allStudents, setAllStudents] = useState<any[]>([])
  const [todayLogs, setTodayLogs] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loadingStudents, setLoadingStudents] = useState(false)

  // Fetch students for manual lookup
  useEffect(() => {
    async function fetchStudents() {
      setLoadingStudents(true)
      try {
        const today = new Date().toISOString().split('T')[0]
        const [{ data: students }, { data: logs }] = await Promise.all([
          supabase
            .from('subscriptions')
            .select(`
              id, seat_number, qr_version,
              student:profiles!inner(id, name, email)
            `)
            .eq('room_id', roomId)
            .eq('status', 'active'),
          supabase
            .from('attendance_logs')
            .select('student_id, timestamp, student:profiles(name, email)')
            .eq('room_id', roomId)
            .eq('date', today)
            .order('timestamp', { ascending: false })
        ])

        setAllStudents(students || [])
        setTodayLogs(logs || [])
      } catch (err) {
        console.error('Failed to fetch data:', err)
      } finally {
        setLoadingStudents(false)
      }
    }
    fetchStudents()

    // Real-time listener for today's logs
    const channel = supabase
      .channel('scanner-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'attendance_logs',
          filter: `room_id=eq.${roomId}`
        },
        async (payload: any) => {
          const newLog = payload.new
          // Only care if it's today
          const today = new Date().toISOString().split('T')[0]
          if (newLog.date !== today) return

          // Fetch student details for the feed
          const { data: student } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', newLog.student_id)
            .single()
          
          const expandedLog = { ...newLog, student }
          setTodayLogs(prev => [expandedLog, ...prev])
          
          // If we manually marked someone, we already show the success card, 
          // but this ensures the button updates immediately too.
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, supabase])

  useEffect(() => {
    let codeReader: BrowserQRCodeReader | null = null
    let controls: any = null

    async function startScanner() {
      try {
        codeReader = new BrowserQRCodeReader()
        const devices = await navigator.mediaDevices.enumerateDevices()
        const videoInputDevices = devices.filter(device => device.kind === 'videoinput')
        
        if (videoInputDevices.length === 0) {
          toast.error('No camera found')
          onClose()
          return
        }

        // Prefer back camera
        const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes('back')) || videoInputDevices[0]
        
        controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          async (result, error) => {
            if (!result || scannedRef.current) return
            
            scannedRef.current = true
            setScanning(true)

            try {
              const payload = JSON.parse(result.getText())
              
              if (payload.type !== 'access_verify') {
                throw new Error('Invalid QR Code type')
              }

              const res = await fetch('/api/manager/attendance/scan', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  studentId: payload.studentId,
                  roomId: roomId,
                  version: payload.version || 0
                })
              })

              const data = await res.json()

              if (res.ok) {
                toast.success(`Attendance marked: ${data.student.name}`)
                setLastScanned(data.student)
                // Wait 2 seconds before allowing next scan
                setTimeout(() => {
                  scannedRef.current = false
                  setScanning(false)
                }, 2000)
              } else if (res.status === 409) {
                toast(data.error || 'Already marked today', {
                   icon: '⚠️',
                   style: {
                     borderRadius: '10px',
                     background: '#fff8f0',
                     color: '#9B4000',
                     border: '1px solid #ffdbcb',
                     fontSize: '12px',
                     fontWeight: 'bold'
                   },
                })
                scannedRef.current = false
                setScanning(false)
              } else {
                throw new Error(data.error || 'Failed to log attendance')
              }
            } catch (err: any) {
              toast.error(err.message || 'Verification failed')
              scannedRef.current = false
              setScanning(false)
            }
          }
        )
        setLoading(false)
      } catch (err) {
        console.error('Scanner Error:', err)
        toast.error('Could not access camera')
        onClose()
      }
    }

    startScanner()

    return () => {
      if (controls) try { controls.stop() } catch (e) {}
      if (codeReader) try { codeReader.reset() } catch (e) {}
    }
  }, [roomId])

  const handleManualMark = async (student: any) => {
    if (scanning) return
    setScanning(true)

    try {
      const res = await fetch('/api/manager/attendance/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: student.student.id,
          roomId: roomId,
          version: student.qr_version || 0
        })
      })

      const data = await res.json()

      if (res.ok) {
        toast.success(`Attendance marked: ${data.student.name}`)
        setLastScanned(data.student)
        setTimeout(() => setScanning(false), 2000)
      } else if (res.status === 409) {
        toast(data.error || 'Already marked today', {
          icon: '⚠️',
          style: {
            borderRadius: '10px',
            background: '#fff8f0',
            color: '#9B4000',
            border: '1px solid #ffdbcb',
            fontSize: '12px',
            fontWeight: 'bold'
          },
        })
        setScanning(false)
      } else {
        throw new Error(data.error || 'Failed to log attendance')
      }
    } catch (err: any) {
      toast.error(err.message || 'Action failed')
      setScanning(false)
    }
  }

  const markedStudentIds = new Set(todayLogs.map(log => log.student_id))

  const filteredResults = allStudents.filter(s => 
    s.student.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="fixed inset-0 z-[100] bg-on-surface/90 backdrop-blur-xl flex flex-col items-center">
      {/* Header */}
      <header className={`w-full flex justify-between items-center px-6 py-8 md:py-12 ${viewMode === 'search' ? 'max-w-7xl' : 'max-w-lg'}`}>
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2 text-primary">
              <QrCode size={18} />
              <span className="text-[10px] font-black uppercase tracking-[.3em]">Live Gateway</span>
           </div>
           <h2 className="text-2xl font-black text-white leading-tight">Attendance: {roomName}</h2>
           <div className="flex p-1 bg-white/5 rounded-xl border border-white/10 mt-3 w-fit">
              <button 
                onClick={() => setViewMode('scan')}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'scan' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
              >
                Scan QR
              </button>
              <button 
                onClick={() => setViewMode('search')}
                className={`px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${viewMode === 'search' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-white/40 hover:text-white'}`}
              >
                Manual Search
              </button>
           </div>
        </div>
        <button 
          onClick={onClose} 
          className="w-12 h-12 bg-white/5 hover:bg-white/10 rounded-2xl flex items-center justify-center text-white transition-all border border-white/10 group overflow-hidden"
        >
           <span className="material-symbols-outlined translate-x-0.5 group-active:scale-90 transition-transform" style={{ fontSize: '24px' }}>
             arrow_back_ios
           </span>
        </button>
      </header>

      {/* Scanner Viewport */}
      {viewMode === 'scan' ? (
        <div className="relative w-full aspect-square max-w-[340px] rounded-[3rem] overflow-hidden border-4 border-white/10 shadow-2xl shadow-black/50 mx-6">
           {loading && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-on-surface gap-4">
                <RefreshCw size={32} className="text-primary animate-spin" />
                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest text-center">Initializing Optics...</span>
             </div>
           )}
           <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
           
           {/* HUD Overlay */}
           <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-2 border-primary/40 rounded-[2rem] relative">
                 {/* Corner Brackets */}
                 <div className="absolute -top-2 -left-2 w-8 h-8 border-t-8 border-l-8 border-primary rounded-tl-2xl" />
                 <div className="absolute -top-2 -right-2 w-8 h-8 border-t-8 border-r-8 border-primary rounded-tr-2xl" />
                 <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-8 border-l-8 border-primary rounded-bl-2xl" />
                 <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-8 border-r-8 border-primary rounded-br-2xl" />
                 
                 {/* Scanning Beam */}
                 <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 shadow-[0_0_20px_rgba(79,70,229,1)] transition-all duration-500 ${scanning ? 'animate-none opacity-0' : 'animate-scan'}`} />
              </div>
           </div>
           
           {scanning && (
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-primary/20 backdrop-blur-sm">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-primary shadow-2xl animate-pulse">
                   <RefreshCw size={40} className="animate-spin" />
                </div>
             </div>
           )}
        </div>
      ) : (
        <div className="flex-1 w-full max-w-7xl px-6 grid grid-cols-1 md:grid-cols-[1fr_350px] gap-8 min-h-0">
          {/* SEARCH COLUMN */}
          <div className="flex flex-col min-h-0">
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" size={18} />
              <input 
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white text-sm outline-none focus:border-primary/50 transition-all placeholder:text-white/10"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
              {loadingStudents ? (
                <div className="py-12 flex flex-col items-center gap-3 opacity-40">
                  <RefreshCw size={24} className="animate-spin text-white" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">Fetching database...</span>
                </div>
              ) : filteredResults.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-3 opacity-20">
                  <UserCircle size={48} className="text-white" />
                  <span className="text-xs font-bold text-white tracking-widest uppercase">No matches found</span>
                </div>
              ) : (
                filteredResults.map((s) => {
                  const isMarked = markedStudentIds.has(s.student.id)
                  return (
                    <div key={s.id} className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between hover:bg-white/10 transition-all group">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/60 group-hover:text-primary transition-colors">
                          <User size={20} />
                        </div>
                        <div className="min-w-0">
                          <h5 className="text-white font-bold text-sm truncate uppercase italic tracking-tight">{s.student.name}</h5>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Seat {s.seat_number || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        disabled={scanning || isMarked}
                        onClick={() => handleManualMark(s)}
                        className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center gap-2 ${
                          isMarked 
                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-none' 
                            : 'bg-primary text-white shadow-primary/10 disabled:opacity-30'
                        }`}
                      >
                        {isMarked && <CheckCircle2 size={12} />}
                        {isMarked ? 'Marked' : 'Mark Present'}
                      </button>
                    </div>
                  )
                })
              )}
            </div>
          </div>

          {/* ACTIVITY FEED COLUMN */}
          <div className="hidden md:flex flex-col min-h-0 bg-white/[0.02] border-l border-white/5 pl-8">
            <div className="flex items-center justify-between mb-6">
               <div className="flex flex-col">
                  <span className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Activity Stream</span>
                  <h4 className="text-sm font-black text-white/60 uppercase italic">Today's Entries</h4>
               </div>
               <div className="px-3 py-1 bg-primary/10 rounded-full">
                  <span className="text-[10px] font-black text-primary">{todayLogs.length}</span>
               </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar pb-10">
              {todayLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 opacity-20 text-center">
                  <RefreshCw size={24} className="mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest">Waiting for check-ins...</p>
                </div>
              ) : (
                todayLogs.map((log, i) => (
                  <div key={log.id || i} className="flex items-center gap-4 bg-white/[0.03] p-4 rounded-2xl border border-white/5 animate-in slide-in-from-right-5 duration-500">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                      <CheckCircle2 size={16} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-black text-white truncate uppercase italic">{log.student?.name}</p>
                      <p className="text-[9px] font-bold text-white/30 uppercase tracking-tighter">
                        {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Scanning Feedback / Status */}
      <div className="mt-8 mb-12 flex flex-col items-center gap-6 w-full max-w-sm px-6 shrink-0">
         {lastScanned ? (
           <div className="w-full bg-emerald-500/10 border border-emerald-500/20 rounded-3xl p-5 flex items-center gap-4 animate-in slide-in-from-bottom-5">
              <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-emerald-500/20 flex-shrink-0">
                 <CheckCircle2 size={32} />
              </div>
              <div className="flex-1 overflow-hidden">
                 <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Entry Recorded</p>
                 <h4 className="text-white font-black text-lg truncate">{lastScanned.name}</h4>
                 <p className="text-xs font-bold text-white/40 truncate">{lastScanned.email}</p>
              </div>
           </div>
         ) : viewMode === 'scan' ? (
           <div className="flex items-center gap-4 text-white/60 bg-white/5 border border-white/5 rounded-3xl p-5 w-full">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                 <Camera size={28} />
              </div>
              <div>
                 <p className="text-xs font-bold text-white">Position QR Code</p>
                 <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">Searching for student credentials...</p>
              </div>
           </div>
         ) : null}
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          position: absolute;
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
