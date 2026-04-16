'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/library'
import { X, Camera, RefreshCw, CheckCircle2, UserCircle, QrCode } from 'lucide-react'
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

  return (
    <div className="fixed inset-0 z-[100] bg-on-surface/90 backdrop-blur-xl flex flex-col items-center">
      {/* Header */}
      <header className="w-full flex justify-between items-center px-6 py-8 md:py-12 max-w-lg">
        <div className="flex flex-col gap-1">
           <div className="flex items-center gap-2 text-primary">
              <QrCode size={18} />
              <span className="text-[10px] font-black uppercase tracking-[.3em]">Live Gateway</span>
           </div>
           <h2 className="text-2xl font-black text-white leading-tight">Attendance: {roomName}</h2>
           <p className="text-sm font-bold text-white/40">Ready to scan student access passes</p>
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

      {/* Scanning Feedback / Status */}
      <div className="mt-12 flex flex-col items-center gap-6 w-full max-w-sm px-6">
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
         ) : (
           <div className="flex items-center gap-4 text-white/60 bg-white/5 border border-white/5 rounded-3xl p-5 w-full">
              <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center">
                 <Camera size={28} />
              </div>
              <div>
                 <p className="text-xs font-bold text-white">Position QR Code</p>
                 <p className="text-[10px] font-medium text-white/40 mt-1 uppercase tracking-wider">Searching for student credentials...</p>
              </div>
           </div>
         )}
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
