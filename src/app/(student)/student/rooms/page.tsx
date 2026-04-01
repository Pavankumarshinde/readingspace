'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

import JoinRoomModal from '@/components/student/JoinRoomModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function StudentRooms() {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      setProfile(profileData)

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`*, rooms (*)`)
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (error) throw error
      setRooms(subs || [])
    } catch (err: any) {
      toast.error('Failed to load rooms')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = rooms.filter(sub =>
    sub.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
         <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Header row */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tight italic">Study Rooms</h2>
          <p className="text-[11px] font-bold text-outline uppercase tracking-[.25em] mt-2 opacity-70">Your joined rooms</p>
        </div>
        <button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-2.5 px-6 py-2.5 bg-primary text-on-primary text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
        >
          <span className="material-symbols-outlined text-[18px]">add_circle</span>
          Join New Room
        </button>
      </section>

      {/* Search bar */}
      <div className="relative group">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary text-sm pointer-events-none group-focus-within:scale-110 transition-transform">
          search
        </span>
        <input
          type="text"
          placeholder="Search your rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-2xl pl-12 pr-12 py-4 text-sm font-bold text-on-surface placeholder:text-outline/30 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/40 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Room List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 bg-surface-container-low/50 rounded-3xl border border-dashed border-outline-variant/30">
            <div className="w-20 h-20 bg-surface-container-highest rounded-3xl flex items-center justify-center mb-6 shadow-sm">
              <span className="material-symbols-outlined text-outline/40 text-4xl font-light">
                {searchQuery ? 'manage_search' : 'sensors_off'}
              </span>
            </div>
            <h3 className="font-headline font-black text-xl text-on-surface mb-2">
              {searchQuery ? 'Room Not Found' : 'No Joined Rooms'}
            </h3>
            <p className="text-[10px] font-bold text-outline uppercase tracking-[.2em] opacity-60 max-w-xs text-center mb-8">
              {searchQuery
                ? 'Try searching for something else'
                : 'Enter a code to join your first reading room'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-8 py-3 bg-surface-container-high text-on-surface rounded-xl text-[10px] font-black uppercase tracking-widest border border-outline-variant/10 hover:bg-surface-container-highest transition-all"
              >
                Join Room
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map((sub) => {
            const room = sub.rooms
            if (!room) return null
            
            return (
              <div key={sub.id} className="card p-6 flex flex-col bg-surface-container-low/30 border border-outline-variant/10 group hover:border-primary/30 transition-all duration-500 shadow-sm hover:shadow-xl overflow-hidden relative">
                {/* Visual Texture */}
                <div className="absolute -top-6 -right-6 w-24 h-24 bg-primary/5 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex justify-between items-start mb-6">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Joined</span>
                      </div>
                      <h3 className="font-headline text-2xl font-black text-on-surface group-hover:text-primary transition-colors tracking-tight italic">{room.name}</h3>
                      <p className="text-[10px] font-medium text-outline line-clamp-1 opacity-70">
                        {room.description || 'A quiet place to study.'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-5 border-y border-outline-variant/10 my-6">
                    <div className="space-y-1">
                      <p className="text-[8px] text-outline uppercase tracking-widest font-black opacity-40">Valid Till</p>
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-[10px] text-primary">calendar_today</span>
                         <p className="font-headline text-xs font-bold text-on-surface">
                           {new Date(sub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                         </p>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[8px] text-outline uppercase tracking-widest font-black opacity-40">Your Seat</p>
                      <div className="flex items-center gap-2">
                         <span className="material-symbols-outlined text-[10px] text-secondary">chair</span>
                         <p className="font-headline text-xs font-black text-secondary uppercase italic">{sub.seat_number}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-2">
                    <Link href={`/student/rooms/${room.id}`}>
                      <button className="w-full py-3.5 bg-surface-container-high text-on-surface hover:bg-primary hover:text-white rounded-xl text-[10px] font-black uppercase tracking-[.25em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] border border-outline-variant/5">
                        Open Room
                        <span className="material-symbols-outlined text-[16px] font-black">arrow_forward_ios</span>
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            )
          })
        )}
      </div>

      {showJoinModal && (
        <JoinRoomModal 
          open={showJoinModal} 
          onClose={() => setShowJoinModal(false)}
          onSuccess={fetchData}
        />
      )}
    </div>
  )
}
