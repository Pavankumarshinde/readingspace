'use client'

import { useState, useEffect, use } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Pencil, MapPin, Users, Key, ScanLine, Trash2, RotateCw,
  QrCode, Info, X, ShieldCheck, Loader2, ChevronRight, Search, Calendar, MoreVertical
} from 'lucide-react'
import Modal from '@/components/ui/Modal'
import QRDisplay from '@/components/manager/QRDisplay'
import AttendanceScanner from '@/components/manager/AttendanceScanner'
import RoomChat from '@/components/shared/RoomChat'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import {
  format, startOfMonth, endOfMonth, startOfDay, endOfDay,
  startOfWeek, endOfWeek, getDaysInMonth, getDay, isSameDay,
  addMonths, subMonths
} from 'date-fns'
import dynamic from 'next/dynamic'

const RoomStudentsTab = dynamic(() => import('@/components/manager/RoomStudentsTab'), { 
  ssr: false, 
  loading: () => <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div> 
})

const RoomDashboardTab = dynamic(() => import('@/components/manager/RoomDashboardTab'), { 
  ssr: false, 
  loading: () => <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div> 
})

export default function ManagerRoomDetail() {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'students' | 'chats'>('dashboard')
  const [managerId, setManagerId] = useState<string>('')
  const [managerName, setManagerName] = useState<string>('Manager')
  const [occupancy, setOccupancy] = useState({ active: 0, total: 0 })

  // Modals
  const [showEditRoom, setShowEditRoom] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [showScanner, setShowScanner] = useState(false)
  const [saving, setSaving] = useState(false)

  // Edit form
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

  // Dashboard and Student states are now managed by their respective components

  // ── Fetch Room ──────────────────────────────────────────────────────────
  const fetchRoom = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setManagerId(user.id)

      const { data: profile } = await supabase.from('profiles').select('name').eq('id', user.id).single()
      if (profile?.name) setManagerName(profile.name)

      const [roomResponse, occupancyResponse] = await Promise.all([
        supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .single(),
        supabase
          .from('subscriptions')
          .select('*', { count: 'exact', head: true })
          .eq('room_id', roomId)
          .eq('status', 'active')
      ])

      const { data: roomData, error } = roomResponse
      const { count } = occupancyResponse

      if (error) throw error
      setRoom(roomData)

      // Set form data for edit
      setFormData({
        id: roomData.id,
        name: roomData.name,
        description: roomData.description || '',
        capacity: roomData.total_seats || 50,
        tier: roomData.tier || 'standard',
        latitude: roomData.latitude,
        longitude: roomData.longitude,
        radius: roomData.radius || 200
      })

      setOccupancy({ active: count || 0, total: roomData.total_seats || 0 })
    } catch (err) {
      console.error(err)
      toast.error('Failed to load room')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRoom()
  }, [roomId])

  // Students & Dashboard fetch removed, delegated to components.

  // ── Room Actions ────────────────────────────────────────────────────────
  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser")
      return
    }
    toast.loading("Capturing precise coordinates...", { id: 'geo' })
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFormData(prev => ({ ...prev, latitude: pos.coords.latitude, longitude: pos.coords.longitude }))
        toast.dismiss('geo')
        toast.success(`Location anchored with ${Math.round(pos.coords.accuracy)}m accuracy`)
      },
      (err) => {
        toast.dismiss('geo')
        toast.error("Location access denied: " + err.message)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  }

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch('/api/manager/rooms/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        toast.success('Room updated successfully')
        setShowEditRoom(false)
        fetchRoom()
      } else {
        const err = await res.json()
        toast.error(err.error || "Failed to update")
      }
    } catch (e) {
      toast.error("Network connection failure")
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteRoom = async () => {
    if (!confirm('Are you sure you want to delete this room? This will also remove all subscriptions, attendance logs and pending requests.')) return
    try {
      const res = await fetch('/api/manager/rooms/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        toast.success('Room deleted')
        router.push('/manager/rooms')
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to delete room')
      }
    } catch (e) {
      toast.error('Network failure')
    }
  }

  const handleRegenerateKey = async () => {
    if (!confirm('This will invalidate the current Join Key. Existing members will stay, but new members will need the new key. Proceed?')) return
    try {
      const res = await fetch('/api/manager/rooms/regenerate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        toast.success('Join Key rotated successfully')
        fetchRoom()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to rotate key')
      }
    } catch (e) {
      toast.error('Network failure')
    }
  }

  // ── Security Actions ──────────────────────────────────────────────────
  const handleRegenerateRoomQR = async () => {
    if (!confirm('This will invalidate the current Room QR code. All physical prints of the old QR will stop working. Proceed?')) return
    try {
      const res = await fetch('/api/manager/rooms/regenerate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId })
      })
      if (res.ok) {
        toast.success('Room QR regenerated successfully')
        fetchRoom() // Refresh room data to get new version
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to regenerate')
      }
    } catch (e) {
      toast.error('Network failure')
    }
  }

  // ── Loading State ───────────────────────────────────────────────────────
  if (loading && !room) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading room...
        </span>
      </div>
    )
  }
  if (!room) return null

  // Render ──────────────────────────────────────────────────────────────
  return (
    <>
      <main className="pt-4 pb-28 md:pt-8 md:pb-12 px-4 max-w-lg mx-auto md:max-w-none md:px-8 xl:max-w-[1400px]">

        {/* ── Page Header ──────────────────────────────────────────────── */}
        <header className="flex flex-col gap-6 mb-8 md:mb-12">
          {/* Top Row: Back Navigation + Name */}
          <div className="flex items-start gap-4">
            <button
              onClick={() => router.push('/manager/rooms')}
              className="w-10 h-10 md:w-12 md:h-12 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-all shrink-0 mt-1"
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                arrow_back
              </span>
            </button>
            <div className="flex flex-col min-w-0">
              <h1 className="font-headline text-3xl md:text-5xl font-bold text-on-surface leading-none tracking-tight break-words pr-4 uppercase italic">
                {room.name}
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-[10px] md:text-xs uppercase tracking-[.2em] text-secondary font-black opacity-60">
                  {room.description || 'Verified Study Zone'}
                </span>
                <span className="w-1 h-1 rounded-full bg-outline-variant/30" />
                <span className="text-[10px] md:text-xs uppercase tracking-[.1em] text-primary font-bold">
                  {room.tier || 'Standard'}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Row: Actions */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Segmented Control */}
            <div className="flex p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full md:w-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'dashboard' 
                    ? 'bg-surface-container-lowest text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                  activeTab === 'students' 
                    ? 'bg-surface-container-lowest text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Students
              </button>
              <button
                onClick={() => setActiveTab('chats')}
                className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${
                  activeTab === 'chats' 
                    ? 'bg-surface-container-lowest text-primary shadow-sm' 
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                Live Chat
                <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              </button>
            </div>

            {/* Actions Menu / Desktop Buttons */}
            <div className="flex items-center gap-2">
              {/* Desktop Only Buttons */}
              <button
                onClick={() => setShowEditRoom(true)}
                className="hidden md:flex w-12 h-12 bg-surface-container-lowest rounded-full items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors text-outline hover:text-primary shrink-0"
                title="Edit Room"
              >
                <Pencil size={20} />
              </button>
              <button
                onClick={handleDeleteRoom}
                className="hidden md:flex w-12 h-12 bg-surface-container-lowest rounded-full items-center justify-center border border-outline-variant/20 hover:bg-error/10 transition-colors text-outline hover:text-error shrink-0"
                title="Delete Room"
              >
                <Trash2 size={20} />
              </button>

              {/* Mobile Only Menu */}
              <div className="relative group md:hidden">
                <button className="w-12 h-12 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 text-on-surface-variant transition-all hover:bg-surface-container">
                  <MoreVertical size={20} />
                </button>
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl opacity-0 translate-y-2 pointer-events-none group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all z-50 p-2">
                   <button 
                     onClick={() => setShowEditRoom(true)}
                     className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-on-surface hover:bg-surface-container-low rounded-xl transition-colors uppercase tracking-widest"
                   >
                     <Pencil size={16} className="text-primary" />
                     Edit Configuration
                   </button>
                   <button 
                     onClick={handleDeleteRoom}
                     className="w-full flex items-center gap-3 px-4 py-3 text-[11px] font-bold text-error hover:bg-error/5 rounded-xl transition-colors uppercase tracking-widest"
                   >
                     <Trash2 size={16} />
                     Permanently Delete
                   </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ══════════════ VIEW MODE DETECTOR ══════════════ */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* DETAILS SECTION */}
            <div className="space-y-4 md:space-y-6">
              {/* Info Cards Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <span className="text-[8px] uppercase tracking-widest text-secondary/60 font-bold">Capacity</span>
                  <p className="text-lg font-bold text-on-surface font-headline mt-1">
                    {occupancy.active}<span className="text-outline text-sm">/{room.total_seats}</span>
                  </p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10">
                  <span className="text-[8px] uppercase tracking-widest text-secondary/60 font-bold">Tier</span>
                  <p className="text-sm font-bold text-on-surface mt-1 uppercase">{room.tier || 'Standard'}</p>
                </div>
                <div className="bg-surface-container-lowest p-4 rounded-xl border border-outline-variant/10 col-span-2 md:col-span-1">
                  <span className="text-[8px] uppercase tracking-widest text-secondary/60 font-bold">Join Key</span>
                  <div className="flex items-center gap-1.5 mt-1">
                    <p className="text-sm font-bold text-primary tracking-wider truncate">{room.join_key}</p>
                    <button
                      onClick={handleRegenerateKey}
                      className="p-1 hover:bg-primary/10 rounded-md text-secondary hover:text-primary transition-all shrink-0"
                      title="Regenerate Key"
                    >
                      <RotateCw size={12} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center bg-surface-container-lowest border border-outline-variant/10 rounded-xl overflow-hidden divide-x divide-outline-variant/10 shadow-sm">
                <button
                  onClick={() => setShowQR(true)}
                  className="flex-1 flex flex-col items-center gap-2 p-4 hover:bg-surface-container-low hover:border-primary/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <QrCode size={16} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-outline group-hover:text-primary transition-colors">Show QR</span>
                </button>
                <button
                  onClick={() => setShowScanner(true)}
                  className="flex-1 flex flex-col items-center gap-2 p-4 hover:bg-surface-container-low hover:border-primary/30 transition-all group"
                >
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                    <ScanLine size={16} />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-outline group-hover:text-primary transition-colors">Attendance</span>
                </button>
              </div>
            </div>

            {/* DASHBOARD SECTION */}
            <div className="pt-8 border-t border-outline-variant/10">
              <RoomDashboardTab roomId={room.id} roomName={room.name} />
            </div>
          </div>
        )}
        
        {activeTab === 'students' && (
          <div className="animate-in slide-in-from-right-4 fade-in duration-300">
            <RoomStudentsTab roomId={room.id} roomName={room.name} />
          </div>
        )}

        {activeTab === 'chats' && (
          <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
            <RoomChat 
              roomId={room.id} 
              currentUserId={managerId} 
              currentUserName={managerName} 
              currentUserType="manager" 
            />
          </div>
        )}
      </main>

      {/* ═══════════ MODALS ═══════════ */}

      {/* Edit Room Modal */}
      {showEditRoom && (
        <Modal open={showEditRoom} onClose={() => setShowEditRoom(false)} title="Configure Room Parameters">
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
                        type="number" step="any"
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
                          type="number" step="any"
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
                      type="range" min="10" max="500" step="10"
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

      {/* QR Display Modal */}
      <Modal open={showQR} onClose={() => setShowQR(false)} title="Security Access QR">
        <QRDisplay 
          roomId={room.id} 
          roomName={room.name} 
          latitude={room.latitude}
          longitude={room.longitude}
          radius={room.radius}
          qrVersion={room.qr_version}
          onRegenerate={handleRegenerateRoomQR}
        />
      </Modal>

      {/* Attendance Scanner */}
      {showScanner && (
        <AttendanceScanner
          roomId={room.id}
          roomName={room.name}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  )
}
