'use client'

import { useEffect, useRef, useState } from 'react'
import { BrowserQRCodeReader } from '@zxing/library'
import { X, Camera, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface QRScannerProps {
  onScan: (payload: string) => Promise<void>
  onClose: () => void
}

export default function QRScanner({ onScan, onClose }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  // Use ref to avoid stale closure - the callback always reads current value
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

        // Prefer back camera on mobile
        const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes('back')) || videoInputDevices[0]
        
        controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          async (result, error) => {
            // Guard: if already processing a scan, ignore all further frames
            if (!result || scannedRef.current) return
            
            // Immediately mark as scanned to block all future frames
            scannedRef.current = true
            setScanning(true)

            // Stop the scanner right away - no more frames needed
            try { controls?.stop() } catch (e) {}
            try { codeReader?.reset() } catch (e) {}

            const payload = result.getText()
            try {
              await onScan(payload)
            } catch (err: any) {
              toast.error(err.message || 'Verification failed')
              // Reset the guard so user can try again
              scannedRef.current = false
              setScanning(false)
            }
          }
        )
        setLoading(false)
      } catch (err) {
        console.error('Scanner Error:', err)
        toast.error('Could not access camera. Please check permissions.')
        onClose()
      }
    }

    startScanner()

    return () => {
      if (controls) {
        try { controls.stop() } catch (e) {}
      }
      if (codeReader) {
        try { codeReader.reset() } catch (e) {}
      }
    }
  }, [])

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col pt-12 items-center px-5">
      <header className="flex-between w-full mb-8">
        <div className="flex flex-col gap-1">
           <h2 className="text-xl font-bold text-white">Scan Entry QR</h2>
           <p className="text-[13px] text-white/60">Align the code within the frame to verify</p>
        </div>
        <button onClick={onClose} className="bg-white/10 p-2 rounded-full text-white">
           <X size={24} />
        </button>
      </header>

      <div className="relative w-full aspect-square max-w-[320px] rounded-3xl overflow-hidden border-2 border-white/20">
         {loading && (
           <div className="absolute inset-0 flex-center bg-black">
              <RefreshCw size={32} className="text-white animate-spin opacity-40" />
           </div>
         )}
         <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />
         
         {/* Scanner Overlay Frame */}
         <div className="absolute inset-0 flex-center pointer-events-none">
            <div className="w-48 h-48 border-2 border-[var(--teal)] rounded-2xl relative shadow-[0_0_0_1000px_rgba(0,0,0,0.5)]">
               <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl-lg" />
               <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr-lg" />
               <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl-lg" />
               <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-white rounded-br-lg" />
               
               {/* Scanning Line Animation */}
               <div className="scanner-line h-0.5 bg-[var(--teal)] opacity-50 absolute w-full top-0" />
            </div>
         </div>
         
         {scanning && (
           <div className="absolute inset-0 flex-center bg-black/60 backdrop-blur-sm">
              <RefreshCw size={40} className="text-white animate-spin" />
           </div>
         )}
      </div>

      <div className="mt-auto mb-16 flex items-center gap-3 bg-white/10 p-4 rounded-2xl border border-white/10 text-white/80">
         <div className="w-10 h-10 bg-[var(--navy)] rounded-xl flex-center text-white">
            <Info size={20} />
         </div>
         <p className="text-[12px] leading-snug">
            Verify you are at the correct location before scanning. Attendance is recorded with GPS and timestamp.
         </p>
      </div>
    </div>
  )
}

function Info({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 16v-4" />
      <path d="M12 8h.01" />
    </svg>
  )
}
