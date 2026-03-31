'use client'

import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

interface QRDisplayProps {
  roomId: string
  roomName: string
}

export default function QRDisplay({ roomId, roomName }: QRDisplayProps) {
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
    <div className="flex flex-col items-center gap-6 p-8 bg-white rounded-3xl shadow-xl">
      <div className="flex flex-col items-center text-center gap-1">
        <h2 className="text-2xl font-bold text-[var(--navy)]">{roomName}</h2>
        <p className="text-[14px] text-[var(--text-secondary)] font-medium">
          Scan to mark today's attendance
        </p>
      </div>
      
      <div className="p-4 bg-[var(--surface-2)] rounded-2xl border-2 border-[var(--border)]">
         <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
      </div>

      <div className="flex flex-col items-center gap-1">
         <span className="text-[11px] font-bold text-[var(--text-muted)] uppercase tracking-widest">VALID FOR</span>
         <span className="text-[15px] font-bold text-[var(--teal)]">
           {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
         </span>
      </div>

      <button onClick={() => window.print()} className="btn-ghost text-[13px] font-bold text-[var(--navy)] border border-[var(--border)] px-6 py-2 rounded-xl">
        Print Station Card
      </button>
    </div>
  )
}
