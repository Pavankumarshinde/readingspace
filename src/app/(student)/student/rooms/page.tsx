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
    <div className="flex flex-col min-h-screen">
      {/* Header row */}
      <section className="mb-4 flex justify-between items-center px-2">
        <div>
          <p className="text-secondary text-[11px] font-medium uppercase tracking-wider mb-0.5">Scholar Portal</p>
          <h2 className="font-headline text-xl font-semibold tracking-tight text-on-surface">My Reading Rooms</h2>
        </div>
        <button 
          onClick={() => setShowJoinModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-outline text-on-surface text-xs font-medium rounded-lg hover:bg-surface-container-low transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-sm">add</span>
          <span className="hidden sm:inline">Join Room</span>
        </button>
      </section>

      {/* Search bar */}
      <div className="relative mb-6 px-2">
        <span className="material-symbols-outlined absolute left-5 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none select-none">
          search
        </span>
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-outline/50 hover:text-on-surface transition-colors"
          >
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Room List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 bg-surface-container-low rounded-2xl border border-outline-variant/30">
            <div className="w-16 h-16 bg-surface-container-highest rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-outline text-3xl">
                {searchQuery ? 'search_off' : 'meeting_room'}
              </span>
            </div>
            <h3 className="font-headline font-semibold text-lg text-on-surface mb-1">
              {searchQuery ? `No rooms matching "${searchQuery}"` : 'No joined rooms yet'}
            </h3>
            <p className="text-on-surface-variant text-sm max-w-xs text-center mb-6">
              {searchQuery
                ? 'Try a different search term.'
                : 'Join a reading room using a key provided by your manager.'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-4 py-2 bg-primary text-on-primary rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
              >
                Join Your First Room
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map((sub) => {
            const room = sub.rooms
            if (!room) return null
            
            return (
              <div key={sub.id} className="bg-surface border border-outline-variant/30 rounded-xl p-5 transition-all duration-200 hover:border-outline-variant/60 group shadow-sm hover:shadow-md">
                <div className="flex flex-col h-full">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-headline text-lg font-semibold text-on-surface group-hover:text-primary transition-colors">{room.name}</h3>
                      <p className="text-on-surface-variant text-xs mt-1 line-clamp-2 leading-relaxed">
                        {room.description || 'Dedicated reading space for focused learning.'}
                      </p>
                    </div>
                    <button className="btn-ghost scale-90">
                      <span className="material-symbols-outlined icon-sm">more_vert</span>
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 py-4 border-y border-outline-variant/10 my-4">
                    <div>
                      <p className="text-[9px] text-outline uppercase tracking-widest mb-1 font-bold">Joined</p>
                      <p className="font-mono text-[10px] font-medium text-on-surface">
                        {new Date(sub.start_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-outline uppercase tracking-widest mb-1 font-bold">Expires</p>
                      <p className="font-mono text-[10px] font-medium text-secondary">
                        {new Date(sub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] text-outline uppercase tracking-widest mb-1 font-bold">Seat</p>
                      <p className="font-mono text-[10px] font-bold text-primary">{sub.seat_number}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Link href={`/student/rooms/${room.id}`}>
                      <button className="w-full py-2.5 bg-surface-container-low border border-outline-variant/30 text-on-surface hover:bg-primary hover:text-on-primary hover:border-primary rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all active:scale-[0.98]">
                        <span>Enter Room</span>
                        <span className="material-symbols-outlined icon-xs font-bold">east</span>
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
