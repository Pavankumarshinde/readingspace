'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Plus, Pencil, MapPin, Users, Info, X, ShieldCheck, Key, RotateCw, Loader2 } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ManagerRooms() {
  const [searchQuery, setSearchQuery] = useState('')
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    id: null as string | null,
    name: '', description: '', capacity: 50, tier: 'standard',
    latitude: null as number | null, longitude: null as number | null, radius: 200
  })

  const fetchRooms = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: dbRooms } = await supabase.from('rooms').select('*').order('created_at', { ascending: false })
      const { data: activeSubs } = await supabase.from('subscriptions').select('room_id').eq('status', 'active')
      const occupancyMap: Record<string, number> = {}
      if (activeSubs) activeSubs.forEach(sub => { occupancyMap[sub.room_id] = (occupancyMap[sub.room_id] || 0) + 1 })
      if (dbRooms) setRooms(dbRooms.map(r => ({ ...r, location: r.description || 'Not set', occupancy: occupancyMap[r.id] || 0, joinKey: r.join_key, premium: r.tier === 'premium' })))
    } catch { toast.error('Could not load rooms') } finally { setLoading(false) }
  }

  useEffect(() => { fetchRooms() }, [])

  const handleGetCurrentLocation = async () => {
    try { const { Geolocation } = await import('@capacitor/geolocation'); const p = await Geolocation.checkPermissions(); if (p.location !== 'granted') { const req = await Geolocation.requestPermissions(); if (req.location !== 'granted') { toast.error("Location access denied"); return } } } catch {}
    toast.loading("Getting your location...", { id: 'geo' })
    const { getPreciseLocation } = await import('@/lib/utils/geolocation')
    const position = await getPreciseLocation()
    if (position) { setFormData(prev => ({ ...prev, latitude: position.latitude, longitude: position.longitude })); toast.dismiss('geo'); toast.success(`Location saved (±${Math.round(position.accuracy)}m)`) }
    else { toast.dismiss('geo'); toast.error("Could not get location") }
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true)
    const isEdit = !!formData.id
    try {
      const res = await fetch(isEdit ? '/api/manager/rooms/update' : '/api/manager/rooms/add', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) })
      if (res.ok) { toast.success(`Room ${isEdit ? 'updated' : 'added'}!`); setShowAddRoom(false); setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 }); fetchRooms() }
      else { const err = await res.json(); toast.error(err.error || "Failed") }
    } catch { toast.error("Network error") } finally { setSaving(false) }
  }

  const handleEditRoom = (room: any) => {
    setFormData({ id: room.id, name: room.name, description: room.description || '', capacity: room.total_seats || 50, tier: room.tier || 'standard', latitude: room.latitude, longitude: room.longitude, radius: room.radius || 200 })
    setShowAddRoom(true)
  }

  const filteredRooms = rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.location?.toLowerCase().includes(searchQuery.toLowerCase()))

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">Loading rooms...</span>
      </div>
    )
  }

  const RoomCard = ({ room }: { room: any }) => (
    <div className="border border-outline-variant/30 rounded-xl p-3.5 bg-surface-container-low transition-all group hover:border-outline-variant/50 hover:shadow-sm">
      <div className="flex justify-between items-start mb-2">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="font-headline text-base font-bold text-on-surface leading-tight truncate uppercase">{room.name}</h3>
        </div>
        <button onClick={(e) => { e.preventDefault(); handleEditRoom(room) }} className="w-7 h-7 rounded-full bg-surface-container text-outline flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all shrink-0">
          <Pencil size={12} />
        </button>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-bold text-outline mb-2.5">
        <div className="flex items-center gap-1"><Users size={10} className="text-primary/60" /><span className="text-on-surface font-bold">{room.occupancy}/{room.total_seats}</span></div>
        <span className="text-outline-variant">|</span>
        <div className="flex items-center gap-1"><Key size={10} className="text-secondary/60" /><span className="uppercase tracking-tighter text-outline">Code:</span><span className="text-secondary tracking-wider truncate max-w-[60px]">{room.joinKey}</span></div>
      </div>
      <div className="flex items-center justify-between border-t border-outline-variant/20 pt-2.5">
        <div className={`text-[8px] font-bold tracking-widest flex items-center gap-1 uppercase shrink-0 ${room.premium ? 'text-primary' : 'text-emerald-700'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${room.premium ? 'bg-primary' : 'bg-emerald-500'}`} />
          {room.premium ? 'Premium' : 'Active'}
        </div>
        <Link href={`/manager/rooms/${room.id}`} prefetch={false} className="inline-flex items-center gap-1 text-primary font-bold text-[9px] uppercase tracking-widest hover:translate-x-1 transition-transform">
          Open <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>arrow_forward</span>
        </Link>
      </div>
    </div>
  )

  const EmptyState = () => (
    <div className="flex flex-col items-center justify-center py-16 text-center col-span-full">
      <span className="material-symbols-outlined text-outline/20 mb-3" style={{ fontSize: '48px' }}>meeting_room</span>
      <h3 className="font-headline text-base font-bold text-on-surface mb-1">{searchQuery ? 'No rooms found' : 'No rooms yet'}</h3>
      <p className="text-[11px] text-secondary/60 max-w-[200px] mb-5 leading-relaxed">{searchQuery ? 'Try a different name.' : 'Add your first room to get started.'}</p>
      {!searchQuery && (
        <button onClick={() => { setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 }); setShowAddRoom(true) }}
          className="px-6 py-2 bg-surface-container-low border border-outline-variant/30 text-secondary text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container transition-colors">
          Add a Room
        </button>
      )}
    </div>
  )

  return (
    <>
      <div className="page-shell">
        {/* ── Fixed Page Header ──────────────────────────────────────────── */}
        <div className="sticky-page-header px-4 md:px-8 pt-4 pb-3">
          <div className="max-w-[1400px] mx-auto">
            {/* Title row */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-headline text-2xl md:text-3xl font-bold text-on-surface tracking-tight leading-none">My Rooms</h2>
                <p className="text-secondary text-[10px] uppercase tracking-widest mt-1 font-bold">All your study rooms</p>
              </div>
              <button onClick={() => { setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 }); setShowAddRoom(true) }}
                className="h-9 bg-primary text-white px-4 rounded-lg flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm shrink-0 text-[11px] font-bold">
                <Plus size={16} /> Add Room
              </button>
            </div>

            {/* Search */}
            <div className="relative group">
              <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-outline/40 group-focus-within:text-primary transition-colors pointer-events-none" style={{ fontSize: '18px' }}>search</span>
              <input type="text" placeholder="Search by room name..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 bg-surface-container-low border-none rounded-lg pl-10 pr-10 text-sm focus:ring-1 focus:ring-primary/40 outline-none placeholder:text-outline/30 transition-all font-medium" />
              {searchQuery && (
                <button className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center hover:bg-surface-container transition-colors" onClick={() => setSearchQuery('')}>
                  <X size={16} className="text-outline" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Scrollable Content ─────────────────────────────────────────── */}
        <div className="scroll-area px-4 md:px-8 py-4 pb-32 md:pb-8 max-w-[1400px] mx-auto w-full">
          {filteredRooms.length === 0 ? <EmptyState /> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5 w-full">
              {filteredRooms.map(room => <RoomCard key={room.id} room={room} />)}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddRoom && (
        <Modal open={showAddRoom} onClose={() => setShowAddRoom(false)} title={formData.id ? "Edit Room Details" : "Add New Room"}>
          <form onSubmit={handleSaveRoom} className="space-y-6 pt-4 pb-2">
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 ml-1"><Info size={14} className="text-primary" /> Room Name</label>
              <input required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input" placeholder="e.g. South Reading Block" />
            </div>
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-on-surface-variant ml-1">Room Address / Location</label>
              <input value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input" placeholder="e.g. 2nd Floor, Knowledge Park" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-on-surface-variant ml-1">Total Seats</label>
                <input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} className="input font-bold" />
              </div>
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-on-surface-variant ml-1">Room Type</label>
                <select value={formData.tier} onChange={e => setFormData({ ...formData, tier: e.target.value })} className="input font-extrabold cursor-pointer">
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Check-in Area Size</p>
                  <p className="text-[10px] font-bold text-outline mt-1">How close students need to be</p>
                </div>
                <button type="button" onClick={handleGetCurrentLocation} className="px-3 py-2 bg-surface-container-lowest border border-outline-variant/20 text-primary text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:border-primary transition-all flex items-center gap-2">
                  <MapPin size={14} /> Locate
                </button>
              </div>
              {formData.latitude !== null && formData.longitude !== null && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">Latitude</label>
                    <input type="number" step="any" value={formData.latitude || ''} onChange={e => setFormData({ ...formData, latitude: parseFloat(e.target.value) || 0 })} className="input py-2 text-[11px] font-bold" placeholder="e.g. 28.6139" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">Longitude</label>
                    <div className="relative">
                      <input type="number" step="any" value={formData.longitude || ''} onChange={e => setFormData({ ...formData, longitude: parseFloat(e.target.value) || 0 })} className="input py-2 text-[11px] font-bold pr-10" placeholder="e.g. 77.2090" />
                      <button type="button" onClick={() => setFormData({ ...formData, latitude: null, longitude: null })} className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-all flex items-center justify-center"><X size={14} /></button>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <input type="range" min="10" max="500" step="10" value={formData.radius} onChange={e => setFormData({ ...formData, radius: parseInt(e.target.value) })} className="flex-1 h-2 bg-outline-variant/30 rounded-full appearance-none cursor-pointer accent-primary" />
                  <span className="w-16 text-center text-sm font-extrabold text-primary bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/20">{formData.radius}m</span>
                </div>
                <div className="flex justify-between text-[9px] font-extrabold text-outline tracking-widest">
                  <span>Strict (10m)</span><span>Flexible (500m)</span>
                </div>
              </div>
            </div>
            <button disabled={saving} className="btn-primary w-full py-4 rounded-2xl shadow-2xl shadow-primary/30">
              <ShieldCheck size={18} /><span>{saving ? 'Saving...' : 'Save Room'}</span>
            </button>
          </form>
        </Modal>
      )}
    </>
  )
}
