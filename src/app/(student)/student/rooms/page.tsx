'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import JoinRoomModal from '@/components/student/JoinRoomModal'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { Loader2 } from 'lucide-react'
import { StudentBrandHeader } from '@/components/student/StudentHeader'

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
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const user = session?.user
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
      toast.error('Could not load your rooms')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const filteredRooms = rooms.filter((sub) =>
    sub.rooms?.name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading rooms...
        </span>
      </div>
    )
  }

  // ── Shared Room Card ─────────────────────────────────────────────────────
  const RoomCard = ({ sub }: { sub: any }) => {
    const room = sub.rooms
    if (!room) return null
    return (
      <div className="border border-outline-variant/30 rounded-xl p-3.5 bg-surface-container-low transition-all group hover:border-outline-variant/50 hover:shadow-sm">
        {/* Card Header */}
        <div className="flex justify-between items-start mb-2">
          <div className="min-w-0 flex-1 mr-2">
            <h3 className="font-headline text-base font-bold text-on-surface leading-tight truncate">
              {room.name}
            </h3>
            <p className="text-outline text-[10px] uppercase tracking-wider flex items-center gap-1 mt-0.5">
              <span
                className="material-symbols-outlined shrink-0"
                style={{ fontSize: '12px' }}
              >
                location_on
              </span>
              <span className="truncate">{room.description || 'Study Zone'}</span>
            </p>
          </div>
          <div className="text-emerald-700 text-[8px] font-bold tracking-widest flex items-center gap-1 uppercase shrink-0 mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
            Active
          </div>
        </div>

        {/* Card Footer — 3-col grid */}
        <div className="grid grid-cols-3 gap-2 items-center border-t border-outline-variant/20 pt-2.5">
          <div>
            <p className="text-[8px] uppercase tracking-widest text-outline font-bold">
              Valid Till
            </p>
            <p className="text-[11px] font-semibold text-on-surface">
              {format(new Date(sub.end_date), 'dd MMM yyyy').toUpperCase()}
            </p>
          </div>
          <div>
            <p className="text-[8px] uppercase tracking-widest text-outline font-bold">
              Your Seat
            </p>
            <p className="text-[11px] font-semibold text-on-surface">
              {sub.seat_number || '—'}
            </p>
          </div>
          <div className="text-right">
            <Link href={`/student/rooms/${room.id}`}>
              <button className="inline-flex items-center gap-1 text-primary font-bold text-[9px] uppercase tracking-widest hover:translate-x-1 transition-transform">
                Open
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '14px' }}
                >
                  arrow_forward
                </span>
              </button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // ── Empty State ──────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center col-span-full">
      <span
        className="material-symbols-outlined text-outline/20 mb-3"
        style={{ fontSize: '48px' }}
      >
        meeting_room
      </span>
      <h3 className="font-headline text-base font-bold text-on-surface mb-1">
        {searchQuery ? 'No rooms found' : 'No rooms joined yet'}
      </h3>
      <p className="text-[11px] text-secondary/60 max-w-[200px] mb-5 leading-relaxed">
        {searchQuery
          ? 'Try a different room name.'
          : 'Get the room code from your owner to join.'}
      </p>
      {!searchQuery && (
        <button
          onClick={() => setShowJoinModal(true)}
          className="px-6 py-2 bg-surface-container-low border border-outline-variant/30 text-secondary text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container transition-colors"
        >
          Join a Room
        </button>
      )}
    </div>
  )

  return (
    <>
      {/* Mobile brand header — fixed at top */}
      <div className="md:hidden">
        <StudentBrandHeader />
      </div>

      {/* Page Shell — full height, flex column */}
      <div className="page-shell">
        {/* ── Fixed Page Header ───────────────────────────────────────── */}
        <div className="sticky-page-header pt-[calc(env(safe-area-inset-top,0px)+3.5rem)] md:pt-4 pb-3">
          <div className="px-4 md:px-8 max-w-[1400px] mx-auto">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight leading-none">
                  My Rooms
                </h2>
                <p className="text-secondary text-[10px] uppercase tracking-widest mt-1 font-bold">
                  All your study places
                </p>
              </div>
              <button
                onClick={() => setShowJoinModal(true)}
                className="h-9 bg-primary text-white px-4 rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 text-[11px] font-bold"
              >
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
                Join Room
              </button>
            </div>

            {/* Search bar */}
            <div className="relative group">
              <span
                className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors pointer-events-none"
                style={{ fontSize: '18px' }}
              >
                search
              </span>
              <input
                type="text"
                placeholder="Search rooms..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-surface-container-low border-none rounded-lg pl-10 pr-10 text-sm focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-outline/30 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
                  onClick={() => setSearchQuery('')}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable Content ───────────────────────────────────────── */}
        <div className="scroll-area px-4 md:px-8 py-4 pb-32 md:pb-8 max-w-[1400px] mx-auto w-full">
          {filteredRooms.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 w-full">
              {filteredRooms.map((sub) => (
                <RoomCard key={sub.id} sub={sub} />
              ))}
            </div>
          )}
        </div>
      </div>

      {showJoinModal && (
        <JoinRoomModal
          open={showJoinModal}
          onClose={() => setShowJoinModal(false)}
          onSuccess={fetchData}
        />
      )}
    </>
  )
}
