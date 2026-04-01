'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
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
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32 px-8">
      {/* Dynamic Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5 opacity-80">Connected Environments</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Your Reading Rooms</h2>
           <p className="text-sm font-medium text-slate-500 mt-2">Manage your active memberships and check-in locations.</p>
        </div>
        <button 
          onClick={() => setShowJoinModal(true)}
           className="btn-primary"
        >
          <Plus size={20} />
          <span>Enter New Room Code</span>
        </button>
      </section>

      {/* Modern Search Control */}
      <div className="relative group">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
        <input
          type="text"
          placeholder="Search among your joined rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="input pl-14 pr-12 w-full py-5"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* Augmented Room Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-32 bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 shadow-inner text-slate-200">
              <DoorOpen size={40} />
            </div>
            <h3 className="text-xl font-extrabold text-on-surface mb-2">
              {searchQuery ? 'Room not found' : 'No active memberships'}
            </h3>
            <p className="text-sm font-medium text-slate-400 max-w-xs text-center mb-10">
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
               <div key={sub.id} className="card p-10 flex flex-col group hover:border-primary/40 h-full relative overflow-hidden">
                {/* Prism Detail */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-16 -mt-16 transition-opacity group-hover:opacity-100" />
                
                <div className="flex flex-col h-full relative z-10">
                  <div className="space-y-4 mb-8">
                    <div className="flex items-center gap-2">
                       <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)] animate-pulse" />
                       <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-widest">Active Member</span>
                    </div>
                    <h3 className="font-headline text-3xl font-extrabold text-on-surface group-hover:text-primary transition-colors tracking-tight">{room.name}</h3>
                    <p className="text-sm font-medium text-slate-500 line-clamp-2 min-h-[40px]">
                      {room.description || 'Access restricted to authorized members only.'}
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 py-6 border-y border-slate-100 my-6">
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Valid Until</p>
                      <div className="flex items-center gap-2.5 text-on-surface">
                         <Calendar size={14} className="text-primary" />
                         <p className="text-xs font-extrabold">
                           {new Date(sub.end_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: '2-digit' })}
                         </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <p className="text-[9px] text-slate-400 uppercase tracking-widest font-bold">Your Seat</p>
                      <div className="flex items-center gap-2.5 text-on-surface">
                         <Armchair size={14} className="text-secondary" />
                         <p className="text-xs font-extrabold uppercase">CODE {sub.seat_number}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4">
                    <Link href={`/student/rooms/${room.id}`}>
                       <button className="btn-primary w-full py-4.5 rounded-2xl group/btn">
                        <span>Open Deployment</span>
                        <ChevronRight size={18} className="transition-transform group-hover/btn:translate-x-1" />
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
