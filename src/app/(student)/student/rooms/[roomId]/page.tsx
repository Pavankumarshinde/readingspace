'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import QRScanner from '@/components/student/QRScanner'
import toast from 'react-hot-toast'

export default function RoomDetail({ params }: { params: { roomId: string } }) {
  const router = useRouter()
  const [showScanner, setShowScanner] = useState(false)

  const room = {
    id: params.roomId,
    name: 'Sunrise Reading Hall',
    location: 'Floor 3, North Wing',
    start: 'Nov 12, 2024',
    expiry: 'Dec 12, 2024',
    status: 'Active',
    streak: 11,
    bestStreak: 15,
    daysAttended: 11,
    expiresIn: 5
  }

  const handleMarkAttendance = async () => {
    setShowScanner(true)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface sticky top-0 z-50 flex items-center justify-between px-6 py-4 w-full">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="btn-ghost material-symbols-outlined text-primary"
          >
            arrow_back
          </button>
          <h1 className="text-xl font-bold font-headline text-primary tracking-tight">ReadingSpace</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden bg-surface-container-highest border border-outline-variant/30">
          <img className="w-full h-full object-cover" src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=100" />
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-6 space-y-6 pb-32">
        {/* Room Header & Location */}
        <section className="space-y-1">
          <h2 className="text-3xl font-bold font-headline text-primary tracking-tight italic">
            {room.name}
          </h2>
          <div className="flex items-center text-on-surface-variant gap-1">
            <span className="material-symbols-outlined text-sm">location_on</span>
            <span className="text-sm font-medium">{room.location}</span>
          </div>
        </section>

        {/* Subscription Dates */}
        <section className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border border-outline-variant/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-surface-container-lowest rounded-xl shadow-sm text-primary">
              <span className="material-symbols-outlined">calendar_today</span>
            </div>
            <div>
              <p className="input-label mb-0.5">Subscription Period</p>
              <p className="text-sm font-semibold text-primary">{room.start} - {room.expiry}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="bg-secondary-fixed text-on-secondary-fixed text-[10px] font-bold uppercase py-1 px-3 rounded-full">
              {room.status}
            </span>
          </div>
        </section>

        {/* Attendance Action */}
        <section className="space-y-3">
          <button 
            onClick={handleMarkAttendance}
            className="btn-gradient w-full justify-center"
          >
            <span className="material-symbols-outlined">how_to_reg</span>
            <span>Mark today's attendance</span>
          </button>
          <div className="flex items-center justify-center gap-2 text-on-surface-variant">
            <span className="material-symbols-outlined text-sm">verified</span>
            <p className="text-[11px] font-medium">QR verification required at location</p>
          </div>
        </section>

        {/* Warning Banner */}
        {room.expiresIn <= 7 && (
          <section className="bg-[#FFF8E1] border border-[#FFECB3] p-3 rounded-2xl flex items-center justify-between gap-3 animate-pulse-subtle">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex-center shrink-0">
                <span className="material-symbols-outlined text-amber-600 text-xl">warning</span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-amber-900 truncate">Plan expiring in {room.expiresIn} days</p>
                <p className="text-[10px] text-amber-800/80 truncate">Renew to keep your current seat</p>
              </div>
            </div>
            <button className="px-4 py-2 text-[11px] font-bold text-primary bg-white border border-primary/10 rounded-xl whitespace-nowrap active:scale-95 transition-all">
              Renew Now
            </button>
          </section>
        )}

        {/* Calendar View */}
        <section className="bg-surface-container-lowest p-5 rounded-3xl shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold text-primary font-headline">November 2024</h3>
            <div className="flex gap-2">
              <button className="btn-ghost p-1"><span className="material-symbols-outlined">chevron_left</span></button>
              <button className="btn-ghost p-1"><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>

          <div className="grid grid-cols-7 text-center text-[10px] font-bold text-outline mb-4 uppercase tracking-[0.1em]">
            <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
          </div>

          <div className="grid grid-cols-7 gap-y-3">
            {/* Logic for grid cells matching the design spec */}
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              const attended = day >= 4 && day <= 14;
              const pastGoal = day >= 1 && day <= 3;
              
              return (
                <div key={i} className="relative flex-center py-2">
                  <span className={`text-[13px] font-semibold relative z-10 ${attended ? 'text-white' : 'text-on-surface'}`}>
                    {day}
                  </span>
                  {attended && <div className="absolute inset-1 bg-secondary rounded-full" />}
                  {pastGoal && <div className="absolute inset-1 bg-secondary-fixed opacity-40 rounded-full" />}
                </div>
              )
            })}
          </div>

          <div className="mt-8 pt-4 border-t border-surface-container flex items-center justify-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Attended</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-secondary-fixed opacity-40" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Past Goal</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-surface-container-highest" />
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">Missed</span>
            </div>
          </div>
        </section>

        {/* Streak Stats */}
        <section className="bg-surface-container-low border border-outline-variant/20 p-4 rounded-2xl flex items-center justify-center gap-2 shadow-sm">
          <span className="material-symbols-outlined text-secondary text-xl fill-icon">local_fire_department</span>
          <p className="text-xs font-semibold tracking-tight text-on-surface-variant uppercase">
            Current Streak: <span className="font-bold text-secondary">{room.streak} days</span>
            <span className="mx-3 text-outline-variant opacity-30">|</span> 
            Best: <span className="font-bold text-primary">{room.bestStreak} days</span>
          </p>
        </section>

      </main>

      {showScanner && (
        <QRScanner 
          onScan={async (p) => { 
            console.log(p); 
            toast.success('Attendance recorded!'); 
            setShowScanner(false);
          }} 
          onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  )
}
