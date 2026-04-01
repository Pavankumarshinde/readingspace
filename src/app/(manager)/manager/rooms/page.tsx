'use client'

import { useState, useEffect } from 'react'
import { Plus, MoreVertical, QrCode, Monitor, Pencil, Trash2, Users, MapPin, Key } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QRDisplay from '@/components/manager/QRDisplay'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ManagerRooms() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Add Room Feature
  const [showAddRoom, setShowAddRoom] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    id: null,
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

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    toast.loading("Fetching coordinates...", { id: 'geo' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }))
        toast.dismiss('geo')
        toast.success("Location captured!")
      },
      (err) => {
        toast.dismiss('geo')
        toast.error("Geolocation failed: " + err.message)
      }
    )
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
        toast.success(`Space ${isEdit ? 'updated' : 'created'} successfully!`)
        setShowAddRoom(false)
        setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
        fetchRooms()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save room")
      }
    } catch (e) {
      toast.error("Network error while saving room")
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

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="section-header text-primary">Space Inventory</h2>
          <p className="section-sub mt-0.5">Operational hubs & capacity</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="btn-sm-minimal bg-primary text-on-primary border-none hover:bg-primary-container h-8 px-3 flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined icon-xs">add</span>
          <span className="hidden sm:inline">New Space</span>
        </button>
      </header>

      {/* Search bar */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none select-none">search</span>
        <input
          type="text"
          placeholder="Search spaces by name or location..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center py-24 text-outline/50">
          <span className="material-symbols-outlined animate-spin mr-3 font-light">progress_activity</span>
          <span className="text-xs font-bold uppercase tracking-widest">Scanning infrastructure...</span>
        </div>
      ) : rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.location?.toLowerCase().includes(searchQuery.toLowerCase())).length === 0 ? (
        <div className="flex flex-col justify-center items-center py-24 bg-surface-container-low rounded-2xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-5xl mb-4 text-outline/20 font-light">meeting_room</span>
          <h3 className="font-headline font-semibold text-lg text-on-surface">No rooms configured</h3>
          <p className="text-xs text-on-surface-variant max-w-xs mt-2 opacity-70">Initialize your first reading hall to begin operations.</p>
          <button 
            onClick={() => setShowAddRoom(true)}
            className="mt-6 btn-primary"
          >
            Create First Hall
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.location?.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
            <div key={room.id} className="card p-5 group flex flex-col gap-6 relative overflow-hidden transition-all hover:shadow-md active:scale-[0.99]">
              <div className="flex justify-between items-start">
                  <div className="flex flex-col">
                    <h3 className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{room.name}</h3>
                    <div className="flex items-center gap-1.5 text-outline font-bold text-[9px] uppercase tracking-widest mt-1.5">
                        <span className="material-symbols-outlined icon-xs scale-75">location_on</span>
                        {room.location}
                    </div>
                  </div>
                  <button className="btn-ghost scale-75">
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
              </div>

              <div className="p-4 bg-surface-container-low/50 rounded-xl border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-2">
                        <span className="material-symbols-outlined icon-xs">groups</span>
                        Live Occupancy
                    </span>
                    <span className="text-xs font-bold text-primary">{room.occupancy} <span className="text-outline/40">/ {room.total_seats}</span></span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${Math.min((room.occupancy / room.total_seats) * 100, 100)}%` }} />
                  </div>
              </div>

              <div className="flex justify-between items-center p-3 bg-surface-container-low/30 rounded-xl border-dashed border border-outline-variant/40">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-bold text-outline/50 uppercase tracking-widest">Entry Protocol</span>
                      <span className="font-mono font-bold text-xs text-secondary tracking-[0.2em] mt-0.5">{room.joinKey}</span>
                    </div>
                    {room.latitude && (
                      <div className="flex flex-col border-l border-outline-variant/30 pl-3">
                         <span className="text-[8px] font-bold text-secondary uppercase tracking-widest">Geofenced</span>
                         <span className="text-[10px] font-bold text-primary mt-0.5">{room.radius}m Radius</span>
                      </div>
                    )}
                  </div>
                  <button className="btn-ghost scale-75 text-primary">
                    <span className="material-symbols-outlined icon-sm">key</span>
                  </button>
              </div>

              <div className="flex gap-2 mt-auto">
                  <button 
                    onClick={() => { setSelectedRoom(room); setShowQR(true); }}
                    className="flex-1 btn-primary !py-2 !text-[11px] !border-none !gap-2"
                  >
                    <span className="material-symbols-outlined icon-xs">qr_code</span>
                    Station
                  </button>
                  <button 
                    onClick={() => handleEditRoom(room)}
                    className="btn-ghost bg-surface-container-low border border-outline-variant/10 w-9 h-9 flex items-center justify-center rounded-lg"
                  >
                    <span className="material-symbols-outlined icon-sm">edit</span>
                  </button>
                  <button className="btn-ghost bg-surface-container-low border border-outline-variant/10 w-9 h-9 flex items-center justify-center rounded-lg">
                    <span className="material-symbols-outlined icon-sm">delete</span>
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Save Room Modal (Add/Edit) */}
      {showAddRoom && (
        <Modal open={showAddRoom} onClose={() => setShowAddRoom(false)} title={formData.id ? "Update Space" : "Create New Space"}>
          <form onSubmit={handleSaveRoom} className="space-y-5 pt-4 overflow-y-auto max-h-[80vh] px-1">
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Room Name</label>
              <input 
                type="text" 
                required 
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20" 
                placeholder="e.g. Sunrise Reading Hall"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div>
              <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Location / Designation</label>
              <input 
                type="text" 
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20" 
                placeholder="e.g. Floor 3, North Wing"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Total Seats</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20" 
                  value={formData.capacity}
                  onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                />
              </div>
              
              <div>
                <label className="text-xs font-bold text-outline uppercase tracking-widest mb-2 block">Space Tier</label>
                <select 
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-primary/20 appearance-none"
                  value={formData.tier}
                  onChange={e => setFormData({ ...formData, tier: e.target.value })}
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
            </div>

            <div className="bg-surface-container-low p-5 rounded-2xl border border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-primary uppercase tracking-tighter italic">Attendance Geofencing</span>
                <button 
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="flex items-center gap-1 text-[10px] font-bold text-secondary border border-secondary/20 px-2 py-1 rounded-lg bg-white"
                >
                  <span className="material-symbols-outlined text-xs">my_location</span>
                  Sync GPS
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                 <div className="bg-white p-2 rounded-lg border border-outline-variant/10">
                    <p className="text-[8px] font-bold text-outline leading-none mb-1">LATITUDE</p>
                    <p className="font-mono text-[10px] text-primary">{formData.latitude?.toFixed(6) || '—'}</p>
                 </div>
                 <div className="bg-white p-2 rounded-lg border border-outline-variant/10">
                    <p className="text-[8px] font-bold text-outline leading-none mb-1">LONGITUDE</p>
                    <p className="font-mono text-[10px] text-primary">{formData.longitude?.toFixed(6) || '—'}</p>
                 </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-bold text-outline uppercase">Scan Radius</label>
                  <span className="text-xs font-black text-primary">{formData.radius}m</span>
                </div>
                <input 
                  type="range"
                  min="10"
                  max="500"
                  step="10"
                  className="w-full h-1.5 bg-outline-variant/30 rounded-lg appearance-none cursor-pointer accent-primary"
                  value={formData.radius}
                  onChange={e => setFormData({ ...formData, radius: parseInt(e.target.value) })}
                />
                <p className="text-[8px] text-outline/60 mt-1.5 italic">Attendance will only scan if student is within his distance.</p>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary w-full py-4 mt-2"
            >
              {saving ? 'Processing...' : formData.id ? 'Save Changes' : 'Finalize Space'}
            </button>
          </form>
        </Modal>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <Modal open={showQR} onClose={() => setShowQR(false)} title="Physical QR Station">
          <QRDisplay roomId={selectedRoom?.id} roomName={selectedRoom?.name} />
        </Modal>
      )}
    </div>
  )
}
