'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { format } from 'date-fns'
import { 
  User, 
  Mail, 
  Phone, 
  CheckCircle2, 
  XCircle, 
  ShieldCheck, 
  Plus, 
  Search, 
  Filter, 
  Users, 
  Calendar,
  CreditCard,
  ChevronRight,
  ArrowRightCircle,
  QrCode,
  Printer,
  Info,
  Armchair,
  Pencil,
  Trash2,
  UserCircle,
  DoorOpen
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

// Helper functions for formatting
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active': return 'bg-emerald-50 text-emerald-600 border-emerald-100'
    case 'due': return 'bg-amber-50 text-amber-600 border-amber-100'
    case 'expired': 
    case 'overdue': return 'bg-rose-50 text-rose-600 border-rose-100'
    default: return 'bg-slate-50 text-slate-500 border-slate-100'
  }
}

const getMemberTypeStyle = (type: string) => {
  switch (type) {
    case 'managed': return 'bg-secondary/10 text-secondary border-secondary/20'
    case 'digital': return 'bg-primary/10 text-primary border-primary/20'
    default: return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

const colors = [
  'bg-indigo-50 text-indigo-600 border-indigo-100',
  'bg-cyan-50 text-cyan-600 border-cyan-100',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100'
]

const calculateWarning = (endDate: string) => {
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))
  if (diffDays <= 0) return 'Expired'
  if (diffDays <= 7) return `${diffDays} days left`
  return null
}

export default function ManagerStudentDirectory() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'active' | 'expired' | 'requests'>('active')
  const [roomFilter, setRoomFilter] = useState<string>('all')
  const [students, setStudents] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()
  const fetching = useRef(false)

  // QR Modal State
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedStudentQR, setSelectedStudentQR] = useState<any>(null)

  // Approval Modal State
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [approvalData, setApprovalData] = useState({
    seatNumber: '',
    tier: 'standard',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  const [acting, setActing] = useState(false)

  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    phone: '',
    seat: '',
    startDate: '',
    endDate: '',
    membershipType: 'digital',
    status: 'active'
  })

  const fetchData = async () => {
    if (fetching.current) return
    fetching.current = true
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) return

      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id, seat_number, tier, start_date, end_date, status, notes, membership_type,
          room:rooms!inner(name, manager_id),
          student:profiles!inner(id, name, email, phone, gender, membership_type)
        `)
        .eq('room.manager_id', user.id)

      if (subsError) throw subsError

      if (subsData) {
        const formatted = subsData.map((sub: any, index: number) => ({
          subscriptionId: sub.id,
          id: sub.id.substring(0, 8).toUpperCase(),
          studentUid: sub.student.id,
          name: sub.student.name || 'Unknown',
          email: sub.student.email,
          phone: sub.student.phone || 'No phone',
          status: sub.status || 'active',
          gender: sub.student.gender || 'Not specified',
          start: sub.start_date,
          expiry: sub.end_date,
          roomName: sub.room.name || 'Unknown Room',
          seatNumber: sub.seat_number || 'Unassigned',
          membershipType: sub.membership_type || sub.student.membership_type || 'digital',
          note: sub.notes || `Assigned to ${sub.room.name}, Seat ${sub.seat_number}.`,
          color: colors[index % colors.length],
          warning: calculateWarning(sub.end_date)
        }))
        setStudents(formatted)
      }

      const { data: reqsData, error: reqsError } = await supabase
        .from('join_requests')
        .select(`
          *,
          room:rooms!inner(id, name, manager_id),
          student:profiles(*)
        `)
        .eq('room.manager_id', user.id)
        .eq('status', 'pending')

      if (reqsError) throw reqsError
      if (reqsData) setRequests(reqsData)

    } catch (err: any) {
      if (err.name === 'NavigatorLockAcquireTimeoutError' || err.message?.includes('Lock')) return
      console.error('Fetch error details:', {
        message: err.message,
        details: err.details,
        hint: err.hint,
        code: err.code
      })
      toast.error(`Sync failed: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
      fetching.current = false
    }
  }

  useEffect(() => {
    fetchData()
    setMounted(true)
  }, [])

  const handleDeclineRequest = async (requestId: string) => {
     setActing(true)
     try {
       const { error } = await supabase
         .from('join_requests')
         .update({ status: 'rejected' })
         .eq('id', requestId)
    
       if (error) throw error
       toast.success('Request removed')
       fetchData()
     } catch (err: any) {
       toast.error('Operation failed')
     } finally {
       setActing(false)
     }
  }

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest) return
    setActing(true)

    try {
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          student_id: selectedRequest.student_id,
          room_id: selectedRequest.room_id,
          seat_number: approvalData.seatNumber,
          tier: approvalData.tier,
          start_date: approvalData.startDate,
          end_date: approvalData.endDate,
          status: 'active'
        })

      if (subError) throw subError

      const { error: reqUpdateError } = await supabase
        .from('join_requests')
        .update({ status: 'accepted' })
        .eq('id', selectedRequest.id)

      if (reqUpdateError) throw reqUpdateError

      toast.success('Membership activated!')
      setShowApproveModal(false)
      fetchData()
    } catch (err: any) {
      toast.error('Approval failed')
    } finally {
      setActing(false)
    }
  }

  const handleEditStudent = (student: any) => {
    setSelectedStudentForEdit(student)
    setEditFormData({
      name: student.name,
      phone: student.phone === 'No phone' ? '' : student.phone,
      seat: student.seatNumber,
      startDate: student.start,
      endDate: student.expiry,
      membershipType: student.membershipType,
      status: student.status
    })
    setShowEditModal(true)
  }

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedStudentForEdit) return
    setActing(true)
    try {
      const res = await fetch('/api/manager/students/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subscriptionId: selectedStudentForEdit.subscriptionId,
          ...editFormData
        })
      })

      if (res.ok) {
        toast.success('Student details updated')
        setShowEditModal(false)
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Update failed')
      }
    } catch (e) {
      toast.error('Network connection error')
    } finally {
      setActing(false)
    }
  }

  const handleDeleteStudent = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to remove this student? This will cancel their subscription for this room.')) return
    
    setActing(true)
    try {
      const res = await fetch('/api/manager/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId })
      })

      if (res.ok) {
        toast.success('Student removed successfully')
        fetchData()
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to remove student')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setActing(false)
    }
  }

  const uniqueRooms = Array.from(new Set(students.map(s => s.roomName).filter(Boolean)))

  const filteredItems = filter === 'requests' 
    ? requests.filter(r => (r.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'active' ? s.status === 'active' : s.status !== 'active'
        const matchesRoom = roomFilter === 'all' || s.roomName === roomFilter
        return matchesSearch && matchesFilter && matchesRoom
      })

  if (!mounted) {
    return (
      <div className="max-w-7xl mx-auto py-40 flex items-center justify-center">
         <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-12 animate-in fade-in duration-1000 pb-32 px-8 pt-12">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 pb-10 border-b border-surface-container-low">
        <div className="space-y-2">
           <span className="section-sub">Administrative Services</span>
           <h2 className="section-header">Student Archive Directory</h2>
        </div>
        <Link href="/manager/students/add" className="btn-primary">
          <Plus size={20} />
          <span>ENROLL NEW READER</span>
        </Link>
      </header>

      {/* Control Bar: Search & Status Toggles */}
      <div className="flex flex-col xl:flex-row gap-8 items-center">
        <div className="relative flex-1 group w-full max-w-2xl">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-on-surface-variant/30 group-focus-within:text-primary transition-colors" size={20} />
          <input
            type="text"
            placeholder="Locate reader by name or digital ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-14 pr-14 w-full py-4 text-sm shadow-ambient"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-6 w-full xl:w-auto">
          <div className="p-1.5 bg-surface-container-low rounded-[12px] flex h-12">
            {(['active', 'expired', 'requests'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-6 py-2 text-[10px] font-bold rounded-[8px] transition-all relative uppercase tracking-[0.08em] ${
                  filter === mode 
                    ? 'bg-surface-container-lowest text-primary shadow-ambient font-black' 
                    : 'text-on-surface-variant/40 hover:text-on-surface'
                }`}
              >
                <span>{mode}</span>
                {mode === 'requests' && requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary text-white rounded-full text-[9px] flex items-center justify-center border-2 border-surface font-black">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filter !== 'requests' && uniqueRooms.length > 1 && (
            <div className="bg-surface-container-low p-1 rounded-[12px] flex items-center gap-1 group">
               <div className="w-10 h-10 flex items-center justify-center text-on-surface-variant/30">
                  <Filter size={18} />
               </div>
               <select
                 value={roomFilter}
                 onChange={e => setRoomFilter(e.target.value)}
                 className="bg-transparent px-4 text-[10px] font-bold text-primary uppercase tracking-[0.08em] outline-none cursor-pointer"
               >
                 <option value="all">Every Archive Room</option>
                 {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
               </select>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 text-slate-300">
           <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-6"></div>
           <span className="text-xs font-bold uppercase opacity-60">Synchronizing database...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="card p-20 text-center flex flex-col items-center bg-white border-dashed border-2">
          <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-300 mb-4">
             <Users size={32} />
          </div>
          <h3 className="text-xl font-extrabold text-on-surface">No student records</h3>
          <p className="text-sm font-medium text-slate-500 mt-2">Try adjusting your filters or search terms.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {filter === 'requests' ? (
            requests.map((req) => (
               <div key={req.id} className="card shadow-ambient group flex flex-col gap-8 h-full">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 bg-primary/10 rounded-[14px] flex items-center justify-center font-bold text-2xl text-primary">
                       {req.student?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="overflow-hidden">
                       <h3 className="font-headline text-lg font-bold text-on-surface truncate uppercase italic tracking-tight">{req.student?.name}</h3>
                       <p className="text-[10px] font-bold text-secondary mt-1 uppercase tracking-[0.1em]">
                          {req.room?.name} ARCHIVE
                       </p>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                     <p className="text-sm font-medium text-on-surface-variant/60">{req.student?.email}</p>
                     <p className="text-[11px] font-bold text-primary tracking-widest">{req.student?.phone || 'NO CONTACT PROVIDED'}</p>
                  </div>

                  <div className="flex gap-4 mt-auto">
                     <button 
                        disabled={acting}
                        onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                        className="flex-1 btn-primary"
                     >
                        REVIEW APPLICATION
                     </button>
                     <button 
                        disabled={acting}
                        onClick={() => handleDeclineRequest(req.id)}
                        className="w-14 h-14 bg-surface-container-low text-on-surface-variant/30 hover:text-error hover:bg-error/5 rounded-[12px] transition-all flex items-center justify-center"
                     >
                        <XCircle size={22} />
                     </button>
                  </div>
               </div>
            ))
          ) : (
            filteredItems.map((student) => (
               <div key={student.subscriptionId} className="card shadow-ambient group hover:scale-[1.01] transition-all flex flex-col h-full relative border border-transparent hover:border-primary/5">
                {/* Header: Name and Status */}
                <div className="flex justify-between items-start gap-4 mb-8">
                  <div className="flex flex-col gap-2">
                    <h3 className="font-headline text-lg font-bold text-on-surface leading-tight uppercase italic tracking-tight group-hover:text-primary transition-colors">
                       {student.name}
                    </h3>
                    <div className="flex items-center gap-2">
                       <div className="w-1 h-1 rounded-full bg-primary" />
                       <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-[0.1em]">{student.roomName}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-2 py-0.5 rounded-[4px] text-[8px] font-black uppercase tracking-[0.1em] border-none bg-surface-container-highest text-on-surface`}>
                       {student.membershipType}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] ring-1 ring-primary/20 bg-primary/5 text-primary`}>
                       {student.status}
                    </span>
                  </div>
                </div>

                {/* Contact details */}
                <div className="space-y-3 mb-8">
                   <p className="text-sm font-medium text-on-surface-variant/60 truncate">{student.email}</p>
                   <p className="text-[11px] font-bold text-primary tracking-widest uppercase">{student.phone}</p>
                </div>

                {/* Metrics Bar */}
                <div className="p-6 bg-surface-container-low rounded-[16px] space-y-4 mb-8">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.1em]">Allocation</span>
                      <span className="text-[12px] font-bold text-on-surface">SPOT {student.seatNumber}</span>
                   </div>
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.1em]">Validity</span>
                      <div className="flex items-center gap-1.5 text-[11px] font-bold text-on-surface uppercase tracking-tight">
                         <span>{format(new Date(student.start), 'dd MMM')}</span>
                         <ChevronRight size={10} className="text-on-surface-variant/20" />
                         <span>{format(new Date(student.expiry), 'dd MMM')}</span>
                      </div>
                   </div>
                </div>

                {/* Actions Bar */}
                <div className="mt-auto pt-8 border-t border-surface-container-low flex items-center justify-between gap-4">
                   <button 
                     onClick={() => { setSelectedStudentQR(student); setShowQRModal(true); }}
                     className="text-[11px] font-bold text-primary uppercase tracking-[0.15em] hover:text-secondary transition-all"
                   >
                     ACCESS PASS
                   </button>
                   
                   <div className="flex items-center gap-3">
                      <button 
                         onClick={() => handleEditStudent(student)}
                         className="p-3 rounded-[10px] bg-surface-container-low text-on-surface-variant/30 hover:text-primary transition-all"
                      >
                         <Pencil size={16} />
                      </button>
                      <button 
                         onClick={() => handleDeleteStudent(student.subscriptionId)}
                         className="p-3 rounded-[10px] bg-surface-container-low text-on-surface-variant/30 hover:text-error transition-all"
                      >
                         <Trash2 size={16} />
                      </button>
                   </div>
                </div>
               </div>
            ))
          )}
        </div>
      )}

      {/* Enroll Floating Button - Desktop Integrated/Mobile Floating */}
      <Link href="/manager/students/add" className="fixed bottom-24 right-10 md:hidden z-50">
         <button className="w-16 h-16 bg-primary text-white rounded-[2rem] shadow-2xl shadow-primary/40 flex items-center justify-center active:scale-90 transition-all border-4 border-white">
            <Plus size={32} />
         </button>
      </Link>

      {/* Review Modal */}
      {showApproveModal && selectedRequest && (
        <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Registration Review">
           <form onSubmit={handleApproveSubmit} className="space-y-8 pt-6">
              <div className="flex items-center gap-5 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-extrabold text-xl text-primary shadow-sm border border-slate-100">
                    {selectedRequest.student?.name?.[0]?.toUpperCase() || 'S'}
                 </div>
                 <div>
                    <h4 className="font-extrabold text-lg text-on-surface leading-none">{selectedRequest.student?.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">{selectedRequest.room?.name}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs font-bold text-on-surface-variant ml-1 mb-2.5 block">Assign Seat</label>
                    <input 
                       type="text" 
                       required
                       placeholder="e.g. A-10"
                       value={approvalData.seatNumber}
                       onChange={e => setApprovalData({...approvalData, seatNumber: e.target.value})}
                       className="input"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-on-surface-variant ml-1 mb-2.5 block">Member Tier</label>
                    <select 
                       value={approvalData.tier}
                       onChange={e => setApprovalData({...approvalData, tier: e.target.value})}
                       className="input cursor-pointer font-extrabold"
                    >
                       <option value="standard">Standard</option>
                       <option value="premium">Premium</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                 <div>
                    <label className="text-xs font-bold text-on-surface-variant ml-1 mb-2.5 block">Start Date</label>
                    <input 
                       type="date" 
                       required
                       value={approvalData.startDate}
                       onChange={e => setApprovalData({...approvalData, startDate: e.target.value})}
                       className="input"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-on-surface-variant ml-1 mb-2.5 block">Expiry Date</label>
                    <input 
                       type="date" 
                       required
                       value={approvalData.endDate}
                       onChange={e => setApprovalData({...approvalData, endDate: e.target.value})}
                       className="input"
                    />
                 </div>
              </div>

              <div className="flex gap-4 pt-4">
                 <button 
                    disabled={acting}
                    type="submit" 
                    className="flex-[2] btn-primary py-4.5 rounded-2xl"
                 >
                    {acting ? 'Processing...' : 'Authorize Access'}
                 </button>
                 <button 
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 bg-white border border-slate-200 text-slate-500 py-4.5 rounded-2xl font-bold hover:bg-slate-50 transition-all shadow-sm"
                 >
                    Cancel
                 </button>
              </div>
           </form>
         </Modal>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Update Student Parameters">
           <form onSubmit={handleUpdateSubmit} className="space-y-6 pt-6">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                 <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm border border-slate-100">
                    <UserCircle size={24} />
                 </div>
                 <div>
                    <h4 className="font-black text-on-surface tracking-tight uppercase">{selectedStudentForEdit.name}</h4>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{selectedStudentForEdit.roomName}</p>
                 </div>
              </div>

              <div className="space-y-4">
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                       <input 
                          type="text"
                          required
                          value={editFormData.name}
                          onChange={e => setEditFormData({...editFormData, name: e.target.value})}
                          className="input px-4 py-3"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number</label>
                       <input 
                          type="text"
                          value={editFormData.phone}
                          onChange={e => setEditFormData({...editFormData, phone: e.target.value})}
                          className="input px-4 py-3"
                          placeholder="e.g. 9876543210"
                       />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Seat</label>
                       <input 
                          type="text"
                          required
                          value={editFormData.seat}
                          onChange={e => setEditFormData({...editFormData, seat: e.target.value})}
                          className="input px-4 py-3"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account Type</label>
                       <select 
                          value={editFormData.membershipType}
                          onChange={e => setEditFormData({...editFormData, membershipType: e.target.value})}
                          className="input px-4 py-3 font-black uppercase cursor-pointer"
                       >
                          <option value="digital">Digital Client</option>
                          <option value="managed">Managed Client</option>
                       </select>
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                       <input 
                          type="date"
                          required
                          value={editFormData.startDate}
                          onChange={e => setEditFormData({...editFormData, startDate: e.target.value})}
                          className="input px-4"
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expiry Date</label>
                       <input 
                          type="date"
                          required
                          value={editFormData.endDate}
                          onChange={e => setEditFormData({...editFormData, endDate: e.target.value})}
                          className="input px-4"
                       />
                    </div>
                 </div>
              </div>

              <button 
                 disabled={acting}
                 className="btn-primary w-full py-4 rounded-2xl shadow-xl shadow-primary/20"
              >
                 {acting ? 'SYNCHRONIZING...' : 'UPDATE STUDENT PROFILE'}
              </button>
           </form>
        </Modal>
      )}

      {/* Access Pass (QR) Modal */}
      {showQRModal && selectedStudentQR && (
        <Modal open={showQRModal} onClose={() => setShowQRModal(false)} title="Student Access Pass">
          <div className="flex flex-col items-center py-10 gap-8">
            {/* Identity Card Header */}
            <div className="w-full flex flex-col items-center text-center">
              <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center font-black text-2xl border-4 border-white shadow-xl mb-4 ${selectedStudentQR.color}`}>
                {selectedStudentQR.name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <h3 className="text-2xl font-black text-on-surface tracking-tight">{selectedStudentQR.name}</h3>
              <div className="flex items-center gap-2 mt-2">
                 <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-widest border ${getMemberTypeStyle(selectedStudentQR.membershipType)}`}>
                    {selectedStudentQR.membershipType === 'managed' ? 'Managed' : 'Digital'}
                 </span>
                 <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border-2 ${getStatusStyle(selectedStudentQR.status)}`}>
                    {selectedStudentQR.status}
                 </span>
              </div>
            </div>

            {/* QR Code Container */}
            <div className="relative group p-8 bg-white rounded-[3rem] shadow-2xl shadow-primary/10 border border-slate-100">
               <div className="absolute inset-0 bg-primary/5 rounded-[3rem] scale-105 opacity-0 group-hover:opacity-100 transition-all duration-500 blur-2xl" />
               <div className="relative bg-white p-4 rounded-2xl border border-slate-50">
                <QRCodeSVG 
                  value={JSON.stringify({ 
                    type: 'access_verify', 
                    uid: selectedStudentQR.studentUid 
                  })} 
                  size={220}
                  level="H"
                  includeMargin={true}
                />
               </div>
               
               {/* Decorative corners for QR frame */}
               <div className="absolute top-4 left-4 w-6 h-6 border-t-2 border-l-2 border-primary/20 rounded-tl-lg" />
               <div className="absolute top-4 right-4 w-6 h-6 border-t-2 border-r-2 border-primary/20 rounded-tr-lg" />
               <div className="absolute bottom-4 left-4 w-6 h-6 border-b-2 border-l-2 border-primary/20 rounded-bl-lg" />
               <div className="absolute bottom-4 right-4 w-6 h-6 border-b-2 border-r-2 border-primary/20 rounded-br-lg" />
            </div>

            {/* Info and Instructions */}
            <div className="max-w-xs text-center space-y-4">
               <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Room & Seat</p>
                  <p className="text-base font-black text-on-surface">{selectedStudentQR.roomName} — {selectedStudentQR.seatNumber}</p>
               </div>
               <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center gap-4 text-left">
                  <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-primary shadow-sm">
                     <Info size={18} />
                  </div>
                  <p className="text-[10px] font-bold text-slate-500 leading-relaxed uppercase tracking-wider">
                     This QR code is used for attendance logging. Scan it at the room entry point to verify access.
                  </p>
               </div>
            </div>

            {/* Print Button */}
            <button 
               onClick={() => window.print()}
               className="btn-primary w-full max-w-xs py-4 rounded-2xl shadow-lg shadow-primary/20 flex justify-center gap-3"
            >
               <Printer size={18} />
               <span>Print Student Pass</span>
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
