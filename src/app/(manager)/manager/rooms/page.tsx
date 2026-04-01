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
        toast.success(`Node ${isEdit ? 'updated' : 'deployed'} successfully!`)
        setShowAddRoom(false)
        setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
        fetchRooms()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to save configuration")
      }
    } catch (e) {
      toast.error("Network synchronization error")
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
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tight">Study Rooms</h2>
          <p className="text-[11px] font-bold text-outline uppercase tracking-[.2em] mt-2 opacity-70">Manage all your reading rooms</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
        >
          <span className="material-symbols-outlined text-sm">add_circle</span>
          Add New Room
        </button>
      </header>

      {/* Search filtration */}
      <div className="relative max-w-lg">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base">search_activity</span>
        <input
          type="text"
          placeholder="Search rooms..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl pl-12 pr-10 py-3.5 text-xs font-bold text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-sm"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-outline/30">
          <span className="material-symbols-outlined animate-spin mb-4 text-4xl">scan</span>
          <span className="text-[10px] font-black uppercase tracking-[.4em]">Querying Hardware Nodes...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {rooms.filter(r => r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.location?.toLowerCase().includes(searchQuery.toLowerCase())).map((room) => (
             <div key={room.id} className="card p-6 flex flex-col gap-8 group hover:border-primary/20 transition-all">
                <div className="flex justify-between items-start">
                   <div className="space-y-1.5">
                      <h3 className="font-headline font-black text-xl text-on-surface leading-none group-hover:text-primary transition-colors">{room.name}</h3>
                      <p className="text-[10px] font-black text-outline uppercase tracking-widest flex items-center gap-1.5 opacity-60">
                         <span className="material-symbols-outlined text-xs">location_searching</span>
                         {room.location}
                      </p>
                   </div>
                   <div className={`px-2 py-1 rounded text-[8px] font-black uppercase tracking-widest border ${
                     room.premium ? 'bg-primary/5 text-primary border-primary/10' : 'bg-outline-variant/5 text-outline border-outline-variant/10'
                   }`}>
                           <option value="standard">Regular Room</option>
                   </div>
                </div>

                <div className="space-y-4">
                   <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-tighter">
                      <span className="text-outline/50 italic flex items-center gap-2">
                        <span className="material-symbols-outlined text-sm">groups</span> Students Present
                      </span>
                      <span className="text-on-surface">{room.occupancy} / {room.total_seats}</span>
                   </div>
                   <div className="h-1.5 w-full bg-surface-container rounded-full overflow-hidden">
                      <div 
                         className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(var(--primary),0.3)]"
                         style={{ width: `${Math.min((room.occupancy / room.total_seats) * 100, 100)}%` }}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                   <div className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] font-black text-outline/40 uppercase tracking-widest mb-1">Room Code</p>
                      <p className="font-mono text-xs font-black text-secondary tracking-widest">{room.joinKey}</p>
                   </div>
                   <div className="bg-surface-container-low border border-outline-variant/10 rounded-xl p-3 flex flex-col items-center justify-center text-center">
                       <p className="text-[8px] font-black text-outline/40 uppercase tracking-widest mb-1">Check-in Range</p>
                      <p className="font-mono text-xs font-black text-primary">{room.radius}m</p>
                   </div>
                </div>

                <div className="flex gap-2">
                   <button 
                     onClick={() => { setSelectedRoom(room); setShowQR(true); }}
                     className="flex-1 bg-surface-container-high hover:bg-surface-container-highest text-on-surface py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 border border-outline-variant/10"
                   >
                     <span className="material-symbols-outlined text-sm">qr_code_2</span>
                     Show QR Code
                   </button>
                   <button 
                     onClick={() => handleEditRoom(room)}
                     className="w-12 h-12 bg-surface-container-low hover:bg-primary/5 text-outline hover:text-primary transition-all rounded-xl border border-outline-variant/10 flex items-center justify-center"
                   >
                      <span className="material-symbols-outlined text-lg">settings</span>
                   </button>
                </div>
             </div>
           ))}
        </div>
      )}
      {/* Modal Overhaul */}
      {showAddRoom && (
         <Modal open={showAddRoom} onClose={() => setShowAddRoom(false)} title={formData.id ? "Edit Room Details" : "Add New Room"}>
            <form onSubmit={handleSaveRoom} className="space-y-8 pt-6 pb-2">
               <div className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Room Name</label>
                    <input 
                       required
                       value={formData.name}
                       onChange={e => setFormData({...formData, name: e.target.value})}
                       className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-outline/30"
                       placeholder="e.g. South Reading Hub"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Room Location</label>
                    <input 
                       value={formData.description}
                       onChange={e => setFormData({...formData, description: e.target.value})}
                       className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-outline/30"
                       placeholder="e.g. Floor 2, Central Plaza"
                    />
                 </div>

                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Total Capacity</label>
                       <input 
                          type="number"
                          value={formData.capacity}
                          onChange={e => setFormData({...formData, capacity: parseInt(e.target.value) || 0})}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Room Type</label>
                       <select 
                          value={formData.tier}
                          onChange={e => setFormData({...formData, tier: e.target.value})}
                          className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all appearance-none cursor-pointer"
                       >
                          <option value="standard">Regular Room</option>
                          <option value="premium">Premium Node</option>
                       </select>
                    </div>
                 </div>

                 <div className="p-5 bg-primary/5 rounded-2xl border border-primary/10 space-y-5">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <p className="text-[10px] font-black text-primary uppercase tracking-[.2em] italic">Check-in Range</p>
                          <p className="text-[8px] font-bold text-outline uppercase tracking-widest opacity-50">Spatial strictness (mtrs)</p>
                       </div>
                       <button 
                         type="button"
                         onClick={handleGetCurrentLocation}
                         className="px-3 py-1.5 bg-white border border-primary/20 text-primary text-[9px] font-black uppercase tracking-widest rounded-lg hover:shadow-sm transition-all flex items-center gap-1.5"
                       >
                          <span className="material-symbols-outlined text-[14px]">share_location</span>
                          Get Location
                       </button>
                    </div>
                    
                    <input 
                       type="range"
                       min="10"
                       max="500"
                       step="10"
                       value={formData.radius}
                       onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})}
                       className="w-full h-1 bg-primary/20 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between font-mono text-[8px] font-black text-outline tracking-widest italic opacity-40">
                       <span>TACTICAL (10m)</span>
                       <span>WIDE (500m)</span>
                    </div>
                 </div>
               </div>

               <button 
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-primary text-white text-[11px] font-black uppercase tracking-[.3em] shadow-xl shadow-primary/20 hover:scale-[1.01] active:scale-95 transition-all disabled:opacity-50"
               >
                  {saving ? 'UPDATING...' : 'SAVE ROOM'}
               </button>
            </form>
         </Modal>
      )}

      {/* QR Code Modal */}
      {showQR && (
        <Modal open={showQR} onClose={() => setShowQR(false)} title="Room QR Code">
          <QRDisplay roomId={selectedRoom?.id} roomName={selectedRoom?.name} />
        </Modal>
      )}
    </div>
  )
}
