'use client'

import { useState, useEffect } from 'react'
import { Plus, QrCode, Pencil, MapPin, Users, Info, Search, X, Settings2, ShieldCheck } from 'lucide-react'
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

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }

    toast.loading("Capturing precise coordinates...", { id: 'geo' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({
          ...prev,
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude
        }))
        toast.dismiss('geo')
        toast.success("Location anchored successfully")
      },
      (err) => {
        toast.dismiss('geo')
        toast.error("Location access denied: " + err.message)
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

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32 px-8">
      {/* Header Section */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5 opacity-80">Infrastructure Management</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Study Rooms</h2>
           <p className="text-sm font-medium text-slate-500 mt-2">Oversee room occupancy, access keys, and security parameters.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="btn-primary"
        >
          <Plus size={20} />
          <span>Add New Room</span>
        </button>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by room name or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-2xl pl-14 pr-10 py-4 text-sm font-medium text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-sm"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 px-4 py-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
           <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Rooms:</span>
           <span className="text-sm font-extrabold text-primary">{rooms.length}</span>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-slate-300">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
           <span className="text-xs font-bold uppercase tracking-[0.3em] opacity-60">Synchronizing Room Data...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
           {filteredRooms.length === 0 ? (
             <div className="col-span-full py-20 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
                   <Search size={32} />
                </div>
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest opacity-60">No rooms match your search</p>
             </div>
           ) : filteredRooms.map((room) => (
             <div key={room.id} className="card p-10 flex flex-col gap-8 group hover:border-primary/30 h-full relative overflow-hidden">
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${room.premium ? 'bg-primary' : 'bg-slate-400'}`} />
                
                <div className="flex justify-between items-start z-10">
                   <div className="space-y-2">
                      <h3 className="font-headline font-extrabold text-2xl text-on-surface leading-tight transition-colors">{room.name}</h3>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                         <MapPin size={12} className="text-slate-300" />
                         {room.location}
                      </p>
                   </div>
                   <div className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border-2 ${
                     room.premium ? 'bg-indigo-50 text-primary border-primary/10' : 'bg-slate-50 text-slate-500 border-slate-100'
                   }`}>
                      {room.premium ? 'Premium' : 'Standard'}
                   </div>
                </div>

                <div className="space-y-5 z-10">
                   <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-400 flex items-center gap-2">
                        <Users size={14} className="text-slate-300" /> 
                        Live Occupancy
                      </span>
                      <span className="text-on-surface font-extrabold">{room.occupancy} / {room.total_seats}</span>
                   </div>
                   <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden shadow-inner">
                      <div 
                         className="h-full bg-primary transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(79,70,229,0.3)]"
                         style={{ width: `${Math.min((room.occupancy / room.total_seats) * 100, 100)}%` }}
                      />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4 z-10">
                   <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Access Key</p>
                      <p className="font-mono text-sm font-extrabold text-secondary tracking-widest">{room.joinKey}</p>
                   </div>
                   <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Range</p>
                      <p className="font-mono text-sm font-extrabold text-primary">{room.radius}m</p>
                   </div>
                </div>

                <div className="flex gap-3 mt-auto pt-4 z-10">
                   <button 
                     onClick={() => { setSelectedRoom(room); setShowQR(true); }}
                     className="flex-1 bg-white border border-slate-200 text-on-surface py-4 rounded-2xl text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-50 hover:border-primary/20 hover:text-primary transition-all flex items-center justify-center gap-2 shadow-sm"
                   >
                     <QrCode size={16} />
                     QR Scan
                   </button>
                   <button 
                     onClick={() => handleEditRoom(room)}
                     className="w-14 h-14 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-center text-primary hover:bg-primary-container hover:border-primary/20 transition-all shadow-sm"
                   >
                      <Settings2 size={20} />
                   </button>
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Modals */}
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

                 <div className="p-6 bg-slate-50 rounded-3xl border border-slate-200 space-y-6 shadow-inner">
                    <div className="flex items-center justify-between">
                       <div className="flex flex-col">
                          <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">Geofence strictness</p>
                          <p className="text-[10px] font-bold text-slate-400 mt-1">Check-in radius in meters</p>
                       </div>
                       <button 
                         type="button"
                         onClick={handleGetCurrentLocation}
                         className="px-4 py-2 bg-white border border-slate-200 text-primary text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:shadow-md hover:border-primary transition-all flex items-center gap-2"
                       >
                          <MapPin size={14} />
                          Locate
                       </button>
                    </div>
                    
                    <div className="space-y-4">
                       <div className="flex items-center gap-4">
                          <input 
                             type="range"
                             min="10"
                             max="500"
                             step="10"
                             value={formData.radius}
                             onChange={e => setFormData({...formData, radius: parseInt(e.target.value)})}
                             className="flex-1 h-2 bg-slate-200 rounded-full appearance-none cursor-pointer accent-primary"
                          />
                          <span className="w-16 text-center text-sm font-extrabold text-primary bg-white px-2 py-1 rounded-lg border border-slate-100">{formData.radius}m</span>
                       </div>
                       <div className="flex justify-between text-[9px] font-extrabold text-slate-400 tracking-widest">
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

      {showQR && (
        <Modal open={showQR} onClose={() => setShowQR(false)} title="Security Access QR">
          <QRDisplay roomId={selectedRoom?.id} roomName={selectedRoom?.name} />
        </Modal>
      )}
    </div>
  )
}
