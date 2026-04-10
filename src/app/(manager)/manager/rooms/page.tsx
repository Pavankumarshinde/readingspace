'use client'

import { useState, useEffect } from 'react'
import { Plus, QrCode, Pencil, MapPin, Users, Info, Search, X, Settings2, ShieldCheck, ScanLine, Trash2, Key, RotateCw } from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QRDisplay from '@/components/manager/QRDisplay'
import AttendanceScanner from '@/components/manager/AttendanceScanner'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

export default function ManagerRooms() {
  const [selectedRoom, setSelectedRoom] = useState<any>(null)
  const [showQR, setShowQR] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showScanner, setShowScanner] = useState(false)
  const [scanningRoom, setScanningRoom] = useState<any>(null)
  
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

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('Are you sure you want to delete this room? This will also remove all subscriptions, attendance logs and pending requests.')) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/manager/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })

      if (res.ok) {
        toast.success('Room deleted successfully')
        fetchRooms()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete room')
        setLoading(false)
      }
    } catch (e) {
      toast.error('Network failure')
      setLoading(false)
    }
  }

  const handleRegenerateKey = async (roomId: string) => {
    if (!confirm('This will invalidate the current Join Key. Existing members will stay, but new members will need the new key. Proceed?')) return
    
    setLoading(true)
    try {
      const res = await fetch('/api/manager/rooms/regenerate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })

      if (res.ok) {
        toast.success('Join Key rotated successfully')
        fetchRooms()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to rotate key')
        setLoading(false)
      }
    } catch (e) {
      toast.error('Network failure')
      setLoading(false)
    }
  }

  const filteredRooms = rooms.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.location?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="max-w-7xl mx-auto space-y-4 animate-in fade-in duration-700 pb-20 px-6">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-2">
        <div>
           <h2 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight leading-none">Study Rooms</h2>
           <p className="text-[10px] md:text-xs font-semibold text-indigo-600 mt-1.5 opacity-90">Manage occupancy and security.</p>
        </div>
        <button 
          onClick={() => {
            setFormData({ id: null, name: '', description: '', capacity: 50, tier: 'standard', latitude: null, longitude: null, radius: 200 })
            setShowAddRoom(true)
          }}
          className="btn-primary py-2 px-6 rounded-xl text-[10px]"
        >
          <Plus size={18} />
          <span>Add New Room</span>
        </button>
      </header>

      {/* Control Bar */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
          <input
            type="text"
            placeholder="Search by room name or location..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-10 py-2.5 text-xs font-medium text-on-surface placeholder:text-slate-400 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all shadow-sm"
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filteredRooms.length === 0 ? (
             <div className="col-span-full py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-100 flex flex-col items-center px-6">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-3">
                   <Search size={24} />
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest opacity-60">No rooms match your search</p>
             </div>
           ) : filteredRooms.map((room) => (
             <div key={room.id} className="card p-4 flex flex-col gap-4 group hover:border-primary/20 h-full relative overflow-hidden rounded-[1.5rem] shadow-sm">
                {/* Visual Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 blur-[60px] opacity-10 transition-opacity group-hover:opacity-20 ${room.premium ? 'bg-primary' : 'bg-slate-400'}`} />
                
                {/* Header: Name, Location, Edit */}
                <div className="flex justify-between items-start z-10">
                   <div className="overflow-hidden">
                      <h3 className="font-headline font-black text-base text-on-surface leading-tight transition-colors truncate uppercase tracking-tight">{room.name}</h3>
                      <div className="flex items-center gap-1.5 mt-1 opacity-60">
                         <MapPin size={10} className="text-primary" />
                         <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate whitespace-nowrap overflow-hidden">{room.location}</p>
                      </div>
                   </div>
                   <button 
                     onClick={() => handleEditRoom(room)}
                     className="w-8 h-8 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-all border border-slate-100 shadow-sm shrink-0"
                   >
                     <Pencil size={14} />
                   </button>
                </div>

                {/* Metrics Bar: Same Line (Occupancy, Access Key, Range) */}
                <div className="flex items-center justify-between gap-1.5 py-2 px-3 bg-slate-50/50 rounded-xl border border-slate-100/50 z-10 shrink-0">
                   <div className="flex items-center gap-1 shrink-0">
                      <Users size={11} className="text-primary/60" />
                      <span className="text-[9px] font-black text-on-surface whitespace-nowrap">{room.occupancy}/{room.total_seats}</span>
                   </div>
                   
                   <div className="h-3 w-[1px] bg-slate-200 shrink-0" />
                   
                   <div className="flex items-center gap-1 overflow-hidden min-w-0 group/key">
                      <Key size={11} className="text-secondary/60 shrink-0" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter shrink-0 mr-0.5">Key:</span>
                      <span className="text-[9px] font-black text-secondary tracking-widest truncate">{room.joinKey}</span>
                      <button 
                        onClick={() => handleRegenerateKey(room.id)}
                        className="p-1 hover:bg-secondary/10 rounded-md text-secondary opacity-0 group-hover:opacity-100 transition-all"
                        title="Regenerate Join Key"
                      >
                         <RotateCw size={10} />
                      </button>
                   </div>

                   <div className="h-3 w-[1px] bg-slate-200 shrink-0" />

                   <div className="flex items-center gap-1 shrink-0">
                      <ScanLine size={11} className="text-primary/60" />
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mr-0.5">Range:</span>
                      <span className="text-[9px] font-black text-primary whitespace-nowrap">{room.radius}m</span>
                   </div>
                </div>

                {/* Actions Bar: Mix of icons and text */}
                <div className="flex items-center justify-between gap-2.5 mt-auto pt-2 z-10">
                    <button 
                      onClick={() => { setSelectedRoom(room); setShowQR(true); }}
                      className="w-10 h-10 bg-white border border-slate-100 text-on-surface rounded-xl hover:bg-slate-50 transition-all flex items-center justify-center shadow-sm shrink-0"
                      title="Room QR Code"
                    >
                      <QrCode size={18} />
                    </button>
                    <button 
                      onClick={() => { setScanningRoom(room); setShowScanner(true); }}
                      className="flex-1 h-10 bg-primary text-white rounded-xl hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center justify-center gap-2 shadow-md px-4"
                    >
                      <ScanLine size={16} />
                      <span className="text-[10px] font-black uppercase tracking-widest leading-none">Attendance</span>
                    </button>
                    <button 
                      onClick={() => handleDeleteRoom(room.id)}
                      className="w-10 h-10 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all flex items-center justify-center border border-rose-100 shadow-sm shrink-0"
                      title="Delete Room"
                    >
                      <Trash2 size={18} />
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
                     
                     {formData.latitude !== null && formData.longitude !== null && (
                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-300">
                           <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Latitude</label>
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
                              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Manual Longitude</label>
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
                                   className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-rose-50 text-slate-300 hover:text-rose-500 transition-all flex items-center justify-center"
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

        <Modal open={showQR} onClose={() => setShowQR(false)} title="Security Access QR">
          <QRDisplay roomId={selectedRoom?.id} roomName={selectedRoom?.name} />
        </Modal>

      {showScanner && scanningRoom && (
        <AttendanceScanner 
           roomId={scanningRoom.id} 
           roomName={scanningRoom.name} 
           onClose={() => setShowScanner(false)} 
        />
      )}
    </div>
  )
}
