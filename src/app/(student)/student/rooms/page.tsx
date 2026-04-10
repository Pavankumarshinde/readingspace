'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import JoinRoomModal from '@/components/student/JoinRoomModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Search, X, Plus, DoorOpen, Calendar, Armchair, ChevronRight, MapPin, Loader2 } from 'lucide-react'

export default function StudentRooms() {
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [rooms, setRooms] = useState<any[]>([])
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

      const { data: subs, error } = await supabase
        .from('subscriptions')
        .select(`*, rooms (*)`)
        .eq('student_id', user.id)
        .eq('status', 'active')

      if (error) throw error
      setRooms(subs || [])
    } catch (err: any) {
      toast.error('Failed to synchronize rooms')
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
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 text-slate-400">
         <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
         <span className="text-xs font-bold uppercase tracking-widest opacity-60">Syncing your active spaces...</span>
      </div>
    )
  }

  return (
    <div className="max-w-[1200px] mx-auto space-y-12 animate-in fade-in duration-1000 pb-32 px-8 pt-12">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-surface-container-low">
        <div className="space-y-2">
           <span className="section-sub">Personal Library</span>
           <h2 className="section-header">Active Archive Rooms</h2>
        </div>
        <button 
          onClick={() => setShowJoinModal(true)}
           className="btn-primary"
        >
          <Plus size={20} />
          <span>JOIN NEW ARCHIVE</span>
        </button>
      </section>

      {/* Editorial Search Control */}
      <div className="relative group max-w-2xl">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors" size={20} />
        <input
          type="text"
          placeholder="Locate an archive room..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input pl-14 pr-14 w-full py-4 text-sm shadow-ambient"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-6 top-1/2 -translate-y-1/2 text-on-surface-variant/20 hover:text-error transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Augmented Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-24 bg-white rounded-2xl border-2 border-dashed border-slate-100">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 shadow-inner text-slate-200">
               <DoorOpen size={32} />
            </div>
            <h3 className="text-lg font-extrabold text-on-surface mb-1.5">
              {searchQuery ? 'Room not found' : 'No active memberships'}
            </h3>
            <p className="text-xs font-medium text-slate-400 max-w-xs text-center mb-8">
              {searchQuery
                ? 'Check the room name for any spelling errors or try a code search.'
                : 'Enter a valid room code provided by your manager to start learning.'}
            </p>
            {!searchQuery && (
              <button 
                onClick={() => setShowJoinModal(true)}
                className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-2xl text-xs font-extrabold uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
              >
                Enter Room Code
              </button>
            )}
          </div>
        ) : (
          filteredRooms.map((sub) => {
            const room = sub.rooms
            if (!room) return null
            
            return (
               <div key={sub.id} className="card shadow-ambient group hover:scale-[1.01] transition-all flex flex-col h-full relative border border-transparent hover:border-primary/5">
                <div className="flex flex-col h-full relative z-10">
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-3">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.4)]" />
                       <span className="text-[10px] font-bold text-secondary uppercase tracking-[0.1em]">Access Granted</span>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-on-surface leading-tight group-hover:text-primary transition-colors italic">{room.name}</h3>
                    <p className="text-sm font-medium text-on-surface-variant/60 line-clamp-2 min-h-[40px]">
                       {room.description || 'Access restricted to authorized members only.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 py-8 border-y border-surface-container-low my-8">
                    <div className="space-y-2">
                       <p className="text-[10px] text-on-surface-variant/30 uppercase tracking-[0.1em] font-bold">Expiration</p>
                       <div className="flex items-center gap-3 text-on-surface">
                          <p className="text-[13px] font-bold tracking-tight">
                            {format(new Date(sub.end_date), 'dd MMM yyyy').toUpperCase()}
                          </p>
                       </div>
                    </div>
                    <div className="space-y-2">
                       <p className="text-[10px] text-on-surface-variant/30 uppercase tracking-[0.1em] font-bold">Allocated Seat</p>
                       <div className="flex items-center gap-3 text-on-surface">
                          <p className="text-[13px] font-bold uppercase tracking-tight">SPOT {sub.seat_number}</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto">
                    <Link href={`/student/rooms/${room.id}`}>
                       <button className="btn-primary w-full group/btn">
                         <span>OPEN ARCHIVE</span>
                         <ChevronRight size={18} className="transition-transform group-hover/btn:translate-x-1.5" />
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
