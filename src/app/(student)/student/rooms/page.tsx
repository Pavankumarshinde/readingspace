'use client'

import { useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import JoinRoomModal from '@/components/student/JoinRoomModal'

export default function StudentRooms() {
  const [showJoinModal, setShowJoinModal] = useState(false)

  const rooms = [
    {
      id: '1',
      name: 'Sunrise Reading Hall',
      location: 'Floor 3, North Wing',
      description: 'Experience the tranquility of morning study sessions in our most sought-after location with panoramic views.',
      type: 'Premium',
      start: 'Nov 12, 2024',
      expiry: 'Dec 12, 2024',
      seat: 'B-12',
      image: 'https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&q=80&w=800',
    },
    {
      id: '2',
      name: 'The Quiet Zone',
      location: 'Floor 1, West Wing',
      description: 'Zero-distraction environment strictly for deep focus work. No devices allowed unless specified.',
      type: 'Standard',
      start: 'Dec 05, 2024',
      expiry: 'Jan 05, 2025',
      seat: 'Q-08',
      image: 'https://images.unsplash.com/photo-1568667256549-094345857637?auto=format&fit=crop&q=80&w=800',
    },
  ]

  return (
    <div className="flex flex-col min-h-screen">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">ReadingSpace</h1>
        </div>
        <div className="flex items-center gap-4">
          <button className="btn-ghost">
            <span className="material-symbols-outlined">search</span>
          </button>
          <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary/10">
             <Avatar name="Julian Thorne" size={40} />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 pb-32 w-full">
        {/* Welcome Section */}
        <section className="mb-12 flex justify-between items-end">
          <div>
            <p className="text-secondary font-medium mb-1">Welcome back, Scholar</p>
            <h2 className="section-header text-3xl mb-2">My Reading Rooms</h2>
            <div className="h-1.5 w-12 bg-secondary rounded-full"></div>
          </div>
          <button 
            onClick={() => setShowJoinModal(true)}
            className="btn-primary"
          >
            <span className="material-symbols-outlined">add</span>
            <span>Join Room</span>
          </button>
        </section>

        {/* Room List Container */}
        <div className="flex flex-col gap-8">
          {rooms.map((room) => (
            <div key={room.id} className="card group relative overflow-hidden p-6 card-hover border-outline-variant/30">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="md:w-1/3 aspect-[4/3] rounded-2xl overflow-hidden relative shrink-0">
                  <img 
                    alt={room.name} 
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500" 
                    src={room.image}
                  />
                  <div className="absolute top-3 left-3">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                       room.type === 'Premium' ? 'bg-secondary-fixed text-on-secondary-fixed' : 'bg-tertiary-fixed text-on-tertiary-fixed'
                    }`}>
                       {room.type}
                    </span>
                  </div>
                </div>
                
                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-headline text-xl font-bold text-primary">{room.name}</h3>
                    <button className="btn-ghost">
                       <span className="material-symbols-outlined">more_vert</span>
                    </button>
                  </div>
                  <p className="text-on-surface-variant text-sm mb-6 leading-relaxed">
                     {room.description}
                  </p>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
                    <div>
                      <p className="input-label">Start</p>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">event_note</span>
                        <span className="font-mono text-[13px] font-semibold">{room.start}</span>
                      </div>
                    </div>
                    <div>
                      <p className="input-label">Expiry</p>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">event_available</span>
                        <span className="font-mono text-[13px] font-semibold">{room.expiry}</span>
                      </div>
                    </div>
                    <div className="col-span-2 md:col-span-1">
                      <p className="input-label">Assigned Seat</p>
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-secondary text-base">chair</span>
                        <span className="font-mono text-[13px] font-semibold">{room.seat}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Link href={`/student/rooms/${room.id}`}>
                      <button className="btn-gradient w-full group/btn overflow-hidden relative">
                        <span className="relative z-10 flex items-center gap-2">
                          Enter Reading Room
                          <span className="material-symbols-outlined text-lg group-hover/btn:translate-x-1 transition-transform">
                             chevron_right
                          </span>
                        </span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showJoinModal && (
        <JoinRoomModal 
          open={showJoinModal} 
          onClose={() => setShowJoinModal(false)}
          onSuccess={() => {}}
        />
      )}
    </div>
  )
}
