'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRDisplayProps {
  roomId: string
  roomName: string
  latitude?: number | null
  longitude?: number | null
  radius?: number | null
}

export default function QRDisplay({ roomId, roomName, latitude, longitude, radius }: QRDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (canvasRef.current) {
      const today = new Date().toISOString().split('T')[0]
      const secret = process.env.NEXT_PUBLIC_QR_SECRET || 'reading-space-default-secret'
      
      // Payload: roomId|date|checksum
      const payload = `${roomId}|${today}|${btoa(roomId + today + secret).slice(0, 8)}`
      
      QRCode.toCanvas(canvasRef.current, payload, {
        width: 300,
        margin: 2,
        color: {
          dark: '#0D2137', // var(--navy)
          light: '#FFFFFF',
        },
      }, (error: any) => {
        if (error) console.error('QR Generation Error:', error)
      })
    }
  }, [roomId])

  return (
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-xl border border-slate-100 print:shadow-none print:border-none print:p-0">
      <div className="flex flex-col items-center text-center gap-2">
        <span className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-3 py-1 rounded-full">Station Card</span>
        <h2 className="text-3xl font-bold text-[#0D2137] mt-2 italic font-headline truncate max-w-[300px]">
           Reading Name: {roomName}
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
         <div className="space-y-1">
            <span className="text-[11px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">VALID FOR</span>
            <span className="text-[15px] font-black text-[#0D2137] block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </span>
         </div>
         
         <div className="py-3 px-5 bg-amber-50 rounded-xl border border-amber-100 border-dashed">
            <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide leading-relaxed">
              Scan this only under the range of distance given. <br/>
              Ensure GPS is enabled on your device.
            </p>
         </div>
      </div>

      <button 
        onClick={() => window.print()} 
        className="print:hidden w-full btn-ghost text-[12px] font-bold text-[#0D2137] border border-slate-200 hover:bg-slate-50 px-8 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all"
      >
        <span className="material-symbols-outlined italic" style={{ fontSize: '18px' }}>print</span>
        PRINT STATION CARD
      </button>
    </div>
  )
}
