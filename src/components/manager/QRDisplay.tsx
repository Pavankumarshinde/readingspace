'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRDisplayProps {
  roomId: string
  roomName: string
  latitude?: number | null
  longitude?: number | null
  radius?: number | null
  qrVersion?: number
  onRegenerate?: () => void
}

export default function QRDisplay({ roomId, roomName, latitude, longitude, radius, qrVersion = 0, onRegenerate }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    // Permanent payload: roomId + qrVersion
    const payload = `${roomId}|v${qrVersion}`
    
    QRCode.toCanvas(canvasRef.current, payload, {
      width: 250,
      margin: 2,
      color: {
        dark: '#0D2137',
        light: '#FFFFFF'
      }
    })
  }, [roomId, qrVersion])

  return (
    <div className="printable-pass flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-xl border border-slate-100">
      <div className="printable-pass-content flex flex-col items-center gap-6 w-full">
        <div className="flex flex-col items-center text-center gap-2">
          <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">Station Card</span>
          <h2 className="text-xl font-bold text-[#0D2137] mt-2 italic font-headline">
             {roomName}
          </h2>
          <div className="flex flex-col gap-1 mt-2">
             <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center justify-center gap-2">
               <span className="opacity-40">Location:</span> 
               {latitude && longitude ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Not Set'}
             </p>
             <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-wider flex items-center justify-center gap-2">
               <span className="opacity-40">Range:</span> 
               {radius ? `${radius} meters` : 'Global'}
             </p>
          </div>
        </div>
        
        <div className="p-5 bg-slate-50 rounded-2xl border-2 border-slate-100 print:bg-white print:border-none">
           <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
        </div>

        <div className="flex flex-col items-center gap-4 px-4 text-center">
           <div className="py-3 px-5 bg-amber-50 rounded-xl border border-amber-100 border-dashed">
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide leading-relaxed">
                Scan this only under the range of distance given. <br/>
                Ensure GPS is enabled on your device.
              </p>
           </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 w-full print:hidden">
        <button 
          onClick={() => window.print()} 
          className="w-full btn-ghost text-[12px] font-bold text-[#0D2137] border border-slate-200 hover:bg-slate-50 px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined italic" style={{ fontSize: '18px' }}>print</span>
          PRINT STATION CARD
        </button>
        {onRegenerate && (
          <button 
            onClick={onRegenerate} 
            className="w-full text-[10px] font-bold text-primary hover:bg-primary/5 py-2 rounded-xl flex items-center justify-center gap-2 transition-all uppercase tracking-widest"
          >
            <span className="material-symbols-outlined italic" style={{ fontSize: '14px' }}>refresh</span>
            Regenerate QR Code
          </button>
        )}
      </div>
    </div>
  )
}
