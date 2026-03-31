'use client'

import { useState } from 'react'
import { Plus, MoreVertical, QrCode, Monitor, Pencil, Trash2, Users, MapPin, Key } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QRDisplay from '@/components/manager/QRDisplay'

export default function ManagerRooms() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)

  const rooms = [
    { id: '1', name: 'Sunrise Reading Hall', location: 'Floor 3, North Wing', capacity: 50, occupancy: 42, joinKey: 'SUN782X', premium: true },
    { id: '2', name: 'The Quiet Zone', location: 'Floor 1, West Wing', capacity: 30, occupancy: 12, joinKey: 'QUIET12', premium: false },
    { id: '3', name: 'Digital Lounge', location: 'Basement, East Wing', capacity: 20, occupancy: 18, joinKey: 'DIGI009', premium: true },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary fill-icon">meeting_room</span>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">Room Management</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-primary text-on-primary flex-center shadow-lg shadow-primary/20 hover:scale-105 transition-all">
          <Plus size={20} />
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 pb-32 w-full space-y-8">
        <section className="flex flex-col gap-1">
          <h2 className="section-header italic text-primary">Your Spaces</h2>
          <p className="section-sub">Manage occupancy, keys, and physical QR stations.</p>
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {rooms.map((room) => (
            <div key={room.id} className="card p-6 card-hover flex flex-col gap-6 relative overflow-hidden">
               <div className="flex-between">
                  <div className="flex flex-col">
                     <h3 className="font-bold text-xl text-primary font-headline italic">{room.name}</h3>
                     <div className="flex items-center gap-1.5 text-on-surface-variant/60 font-medium text-[11px] uppercase tracking-wider">
                        <MapPin size={12} /> {room.location}
                     </div>
                  </div>
                  <button className="btn-ghost !bg-surface-container-low border border-outline-variant/10 p-2">
                     <MoreVertical size={16} />
                  </button>
               </div>

               <div className="space-y-3 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/5">
                  <div className="flex-between items-center text-[13px] font-bold">
                     <span className="text-on-surface-variant flex items-center gap-2">
                        <Users size={16} className="text-outline" /> Occupancy
                     </span>
                     <span className="text-primary">{room.occupancy} / {room.capacity}</span>
                  </div>
                  <div className="progress-bar h-1.5">
                     <div className="progress-fill !bg-primary" style={{ width: `${(room.occupancy / room.capacity) * 100}%` }} />
                  </div>
               </div>

               <div className="flex-between bg-surface-container-low p-4 rounded-2xl border-dashed border-2 border-outline-variant/20">
                  <div className="flex flex-col gap-1">
                     <span className="text-[9px] font-bold text-outline uppercase tracking-widest leading-none">Join Key</span>
                     <span className="font-mono font-bold text-lg text-secondary tracking-widest">{room.joinKey}</span>
                  </div>
                  <button className="btn-ghost bg-white/50 shadow-sm border border-outline-variant/10 p-2">
                     <Key size={16} className="text-primary" />
                  </button>
               </div>

               <div className="flex gap-2">
                  <button 
                    onClick={() => { setSelectedRoom(room); setShowQR(true); }}
                    className="flex-1 btn-primary py-3 rounded-xl !text-[12px] !gap-1.5"
                  >
                     <QrCode size={16} /> QR Station
                  </button>
                  <button className="btn-ghost bg-surface-container-low border border-outline-variant/10 px-4 rounded-xl">
                     <Monitor size={16} />
                  </button>
                  <button className="btn-ghost bg-surface-container-low border border-outline-variant/10 px-4 rounded-xl">
                     <Pencil size={16} />
                  </button>
               </div>
            </div>
          ))}
        </div>
      </main>

      {showQR && (
        <Modal open={showQR} onClose={() => setShowQR(false)} title="Physical QR Station">
          <QRDisplay roomId={selectedRoom?.id} roomName={selectedRoom?.name} />
        </Modal>
      )}
    </div>
  )
}
