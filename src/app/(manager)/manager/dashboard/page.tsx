'use client'

import { useState, useEffect } from 'react'
import { Server, Users, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { startOfDay, endOfDay } from 'date-fns'

export default function ManagerDashboard() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  
  // Minimal Metrics
  const [roomsCount, setRoomsCount] = useState(0)
  const [occupancy, setOccupancy] = useState({ active: 0, total: 0 })
  const [todaysCheckins, setTodaysCheckins] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: dbProfile }, { data: dbRooms }] = await Promise.all([
        supabase.from('profiles').select('name').eq('id', user.id).single(),
        supabase.from('rooms').select('id, total_seats').eq('manager_id', user.id)
      ])

      if (dbProfile) setProfile(dbProfile)
      
      const activeRooms = dbRooms || []
      setRoomsCount(activeRooms.length)
      const activeRoomIds = activeRooms.map(r => r.id)
      const totalCapacity = activeRooms.reduce((sum, r) => sum + r.total_seats, 0)

      if (activeRoomIds.length > 0) {
        const todayStart = startOfDay(new Date()).toISOString()
        const todayEnd = endOfDay(new Date()).toISOString()

        const [{ count: activeCount }, { count: checkinsCount }] = await Promise.all([
          supabase.from('subscriptions').select('*', { count: 'exact', head: true }).in('room_id', activeRoomIds).eq('status', 'active'),
          supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).in('room_id', activeRoomIds).gte('timestamp', todayStart).lte('timestamp', todayEnd)
        ])

        setOccupancy({ active: activeCount || 0, total: totalCapacity })
        setTodaysCheckins(checkinsCount || 0)
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  return (
    <main className="pt-4 pb-28 md:pt-8 md:pb-12 px-4 max-w-lg mx-auto md:max-w-none md:px-8 xl:max-w-[1400px]">
      <header className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
        <h1 className="font-headline text-3xl md:text-5xl font-bold tracking-tight text-on-surface mb-2">
           Overview
        </h1>
        <p className="text-on-surface-variant text-sm max-w-md leading-relaxed font-bold">
           Global metrics across {roomsCount} rooms. For detailed analytics and management, visit a specific room.
        </p>
      </header>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : (
        <div className="space-y-6 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
             <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Users size={64} /></div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest relative z-10">Total Occupancy</p>
                <div className="flex items-baseline gap-1 mt-2 relative z-10">
                   <span className="text-4xl font-headline font-bold text-on-surface">{occupancy.active}</span>
                   <span className="text-sm font-bold text-on-surface-variant/40">/{occupancy.total} seats</span>
                </div>
             </div>

             <div className="p-6 bg-white rounded-3xl border border-outline-variant/10 shadow-sm flex flex-col gap-2 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform"><Server size={64} /></div>
                <p className="text-[10px] font-bold text-secondary uppercase tracking-widest relative z-10">Today's Check-ins</p>
                <div className="flex items-baseline gap-1 mt-2 relative z-10">
                   <span className="text-4xl font-headline font-bold text-on-surface">{todaysCheckins}</span>
                   <span className="text-sm font-bold text-on-surface-variant/40">logs</span>
                </div>
             </div>
          </div>

          <div className="mt-8">
            <Link href="/manager/rooms" className="inline-flex items-center gap-2 p-4 bg-surface-container-low text-on-surface rounded-2xl hover:bg-surface-container transition-all text-sm font-bold shadow-sm border border-outline-variant/10">
              Manage Detailed Analytics in Rooms <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      )}
    </main>
  )
}
