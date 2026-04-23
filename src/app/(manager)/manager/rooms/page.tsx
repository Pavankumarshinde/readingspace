'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Pencil, MapPin, Users, Info, Search, X, ShieldCheck, ScanLine, Key, RotateCw, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ManagerRooms() {
  const [searchQuery, setSearchQuery] = useState('')

  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Add Room Feature
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    id: null as string | null,
    name: '',
    description: '',
    capacity: 50,
    tier: 'standard',
    latitude: null as number | null,
    longitude: null as number | null,
    radius: 200
  })

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dbRooms } = await supabase
        .from('rooms')
        .select('*')
        .order('created_at', { ascending: false })

      const { data: activeSubs } = await supabase
        .from('subscriptions')
        .select('room_id')
        .eq('status', 'active')

      const occupancyMap: Record<string, number> = {}
      if (activeSubs) {
        activeSubs.forEach(sub => {
          occupancyMap[sub.room_id] = (occupancyMap[sub.room_id] || 0) + 1
        })
      }

      if (dbRooms) {
        setRooms(dbRooms.map(r => ({
          ...r,
          location: r.description || 'Not specified',
          occupancy: occupancyMap[r.id] || 0,
          joinKey: r.join_key,
          premium: r.tier === 'premium'
        })))
      }
    } catch (error) {
       console.error(error)
       toast.error('Failed to load rooms')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRooms()
  }, [])

  const handleGetCurrentLocation = async () => {
    try {
      const { Geolocation } = await import('@capacitor/geolocation');
      const p = await Geolocation.checkPermissions();
      if (p.location !== 'granted') {
        const req = await Geolocation.requestPermissions();
        if (req.location !== 'granted') {
          toast.error("Location access denied");
          return;
        }
      }
    } catch (e) {
      console.log('Capacitor Geolocation not available');
    }

    toast.loading("Capturing precise coordinates...", { id: 'geo' })
    const { getPreciseLocation } = await import('@/lib/utils/geolocation')
    const position = await getPreciseLocation()

    if (position) {
      setFormData(prev => ({
        ...prev,
        latitude: position.latitude,
        longitude: position.longitude
      }))
      toast.dismiss('geo')
      toast.success(`Location anchored with ${Math.round(position.accuracy)}m accuracy`)
    } else {
      toast.dismiss('geo')
      toast.error("Location verification timed out or denied")
    }
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    const isEdit = !!formData.id
    const endpoint = isEdit ? '/api/manager/rooms/update' : '/api/manager/rooms/add'
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (res.ok) {
        toast.success(`Room ${isEdit ? 'updated' : 'added'} successfully`)
        setShowAddRoom(false)
        setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
        fetchRooms()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to process request")
      }
    } catch (e) {
      toast.error("Network connection failure")
    } finally {
      setSaving(false)
    }
  }

  const handleEditRoom = (room: any) => {
    setFormData({
      id: room.id,
      name: room.name,
      description: room.description || '',
      capacity: room.total_seats || 50,
      tier: room.tier || 'standard',
      latitude: room.latitude,
      longitude: room.longitude,
      radius: room.radius || 200
    })
    setShowAddRoom(true)
  }

  const filteredRooms = rooms.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // ── Loading ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Syncing rooms...
        </span>
      </div>
    )
  }

  // ── Room Card ─────────────────────────────────────────────────────────────
  const RoomCard = ({ room }: { room: any }) => (
    <div className="border border-outline-variant/30 rounded-lg p-3 bg-surface-container-low transition-all group hover:border-outline-variant/50">
      {/* Card Header */}
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="font-headline text-lg font-bold text-on-surface leading-tight truncate uppercase">
            {room.name}
          </h3>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button 
            onClick={(e) => { e.preventDefault(); handleEditRoom(room); }}
            className="w-7 h-7 rounded-full bg-surface-container text-outline flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shrink-0"
          >
            <Pencil size={12} />
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="flex items-center gap-2 text-[9px] font-bold text-outline mb-2.5">
        <div className="flex items-center gap-1">
          <Users size={10} className="text-primary/60" />
          <span className="text-on-surface font-bold">{room.occupancy}/{room.total_seats}</span>
        </div>
        <span className="text-outline-variant">|</span>
        <div className="flex items-center gap-1">
          <Key size={10} className="text-secondary/60" />
          <span className="uppercase tracking-tighter text-outline">Key:</span>
          <span className="text-secondary tracking-wider truncate max-w-[60px]">{room.joinKey}</span>
        </div>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5">
        <div className="flex items-center gap-2">
          <div className={`text-[8px] font-bold tracking-widest flex items-center gap-1 uppercase shrink-0 ${room.premium ? 'text-primary' : 'text-emerald-700'}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${room.premium ? 'bg-primary' : 'bg-emerald-500'}`} />
            {room.premium ? 'Premium' : 'Active'}
          </div>
        </div>
        <Link href={`/manager/rooms/${room.id}`} prefetch={false} className="inline-flex items-center gap-1 text-primary font-bold text-[9px] uppercase tracking-widest hover:translate-x-1 transition-transform">
          Enter
          <span
            className="material-symbols-outlined"
            style={{ fontSize: '14px' }}
          >
            arrow_forward
          </span>
        </Link>
      </div>
    </div>
  )

  // ── Empty State ───────────────────────────────────────────────────────────
  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center col-span-full">
      <span
        className="material-symbols-outlined text-outline/20 mb-3"
        style={{ fontSize: '48px' }}
      >
        meeting_room
      </span>
      <h3 className="font-headline text-base font-bold text-on-surface mb-1">
        {searchQuery ? 'No rooms found' : 'No rooms yet'}
      </h3>
      <p className="text-[11px] text-secondary/60 max-w-[200px] mb-5 leading-relaxed">
        {searchQuery
          ? 'Try a different search term.'
          : 'Create your first study room to get started.'}
      </p>
      {!searchQuery && (
        <button
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="px-6 py-2 bg-surface-container-low border border-outline-variant/30 text-secondary text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container transition-colors"
        >
          Add a Room
        </button>
      )}
    </div>
  )

  return (
    <>
      <main className="pt-4 pb-28 md:pt-8 md:pb-12 px-4 max-w-lg mx-auto md:max-w-none md:px-8 xl:max-w-[1400px]">
        {/* Hero */}
        <section className="mt-4 md:mt-0 mb-6 md:mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="text-left">
            <h2 className="font-headline text-3xl md:text-4xl font-bold text-on-surface tracking-tight leading-none">
              Study Rooms
            </h2>
            <p className="text-secondary text-[10px] uppercase tracking-widest mt-1.5 md:mt-2 font-bold">
              manage study halls
            </p>
          </div>
          <button 
            onClick={() => {
              setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
              setShowAddRoom(true)
            }}
            className="hidden md:flex btn-primary py-2.5 px-6 rounded-xl text-[10px]"
          >
            <Plus size={18} />
            <span>Add New Room</span>
          </button>
        </section>

        {/* Search + Counter */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3 mb-6 md:mb-8 w-full">
          <div className="relative flex-grow group">
            <span
              className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors pointer-events-none"
              style={{ fontSize: '20px' }}
            >
              search
            </span>
            <input
              type="text"
              placeholder="Search by room name or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-11 md:h-12 bg-surface-container-low border-none rounded-lg pl-11 pr-12 text-sm focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-outline/30 transition-all font-body font-medium"
            />
            {searchQuery && (
              <button
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
                onClick={() => setSearchQuery('')}
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Add Button */}
        <button
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="md:hidden w-full h-11 bg-primary text-white rounded-lg flex items-center justify-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm mb-6"
        >
          <Plus size={18} />
          <span className="uppercase tracking-widest text-[11px] font-bold">Add New Room</span>
        </button>

        {/* Cards — Responsive Grid */}
        {filteredRooms.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 w-full">
            {filteredRooms.map((room) => (
              <RoomCard key={room.id} room={room} />
            ))}
          </div>
        )}
      </main>

      {/* ── Add/Edit Room Modal ──────────────────────────────────────────── */}
      {showAddRoom && (
         <Modal open={showAddRoom} onClose={() => setShowAddRoom(false)} title={formData.id ? "Configure Room Parameters" : "Launch New Room"}>
            <form onSubmit={handleSaveRoom} className="space-y-8 pt-6 pb-2">
               <div className="space-y-6">
                 <div className="space-y-2.5">
                    <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 ml-1">
                      <Info size={14} className="text-primary" /> Room Name
                    </label>
                    <input 
                       required
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       className="input"
                       placeholder="e.g. South Reading Block"
                    />
                 </div>

                 <div className="space-y-2.5">
                    <label className="text-xs font-bold text-on-surface-variant ml-1">Room Location / Address</label>
                    <input 
                       value={formData.description}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                       className="input"
                       placeholder="e.g. 2nd Floor, Knowledge Park"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2.5">
                       <label className="text-xs font-bold text-on-surface-variant ml-1">Total Capacity</label>
                       <input 
                          type="number"
                          value={formData.capacity}
                          onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                          className="input font-bold"
                       />
                    </div>
                    <div className="space-y-2.5">
                       <label className="text-xs font-bold text-on-surface-variant ml-1">Room Tier</label>
                       <select 
                          value={formData.tier}
                          onChange={e => setFormData({...formData, tier: e.target.value})}
                          className="input font-extrabold cursor-pointer"
                       >
                          <option value="standard">Standard</option>
                          <option value="premium">Premium Elite</option>
                       </select>
                    </div>
                 </div>

                 <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-6">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Geofence Strictness</p>
                          <p className="text-[10px] font-bold text-outline mt-1">Check-in radius in meters</p>
                       </div>
                        <button 
                          type="button"
                          onClick={handleGetCurrentLocation}
                          className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 text-primary text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:border-primary transition-all flex items-center gap-2"
                        >
                           <MapPin size={14} />
                           Locate
                        </button>
                     </div>
                     
                     {formData.latitude !== null && formData.longitude !== null && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-300">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">Manual Latitude</label>
                              <input 
                                 type="number"
                                 step="any"
                                 value={formData.latitude || ''}
                                 onChange={e => setFormData({...formData, latitude: parseFloat(e.target.value) || 0})}
                                 className="input py-2 text-[11px] font-bold"
                                 placeholder="e.g. 28.6139"
                              />
                           </div>
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">Manual Longitude</label>
                              <div className="relative group">
                                 <input 
                                    type="number"
                                    step="any"
                                    value={formData.longitude || ''}
                                    onChange={e => setFormData({...formData, longitude: parseFloat(e.target.value) || 0})}
                                    className="input py-2 text-[11px] font-bold pr-10"
                                    placeholder="e.g. 77.2090"
                                 />
                                 <button 
                                   type="button"
                                   onClick={() => setFormData({...formData, latitude: null, longitude: null})}
                                   className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-all flex items-center justify-center"
                                 >
                                    <X size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                     )}

                     <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <input 
                             type="range"
                             min="10"
                             max="500"
                             step="10"
                             value={formData.radius}
                             onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})}
                             className="flex-1 h-2 bg-outline-variant/30 rounded-full appearance-none cursor-pointer accent-primary"
                          />
                          <span className="w-16 text-center text-sm font-extrabold text-primary bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/20">{formData.radius}m</span>
                       </div>
                       <div className="flex justify-between text-[9px] font-extrabold text-outline tracking-widest">
                          <span>HIGH SECURITY (10m)</span>
                          <span>FLEXIBLE (500m)</span>
                       </div>
                    </div>
                 </div>
               </div>

               <button 
                  disabled={saving}
                  className="btn-primary w-full py-4.5 rounded-2xl shadow-2xl shadow-primary/30"
               >
                  <ShieldCheck size={20} />
                  <span>{saving ? 'UPDATING...' : 'SAVE CONFIGURATION'}</span>
               </button>
            </form>
         </Modal>
      )}
    </>
  )
}
