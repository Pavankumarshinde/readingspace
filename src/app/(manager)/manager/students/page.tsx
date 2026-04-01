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
  ArrowRightCircle
} from 'lucide-react'

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
  const supabase = createClient()
  const fetching = useRef(false)

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
          id, seat_number, tier, start_date, end_date, status, notes,
          room:rooms!inner(name, manager_id),
          student:profiles!inner(id, name, email, phone, gender)
        `)
        .eq('room.manager_id', user.id)

      if (subsError) throw subsError

      if (subsData) {
        const formatted = subsData.map((sub: any, index: number) => ({
          subscriptionId: sub.id,
          id: sub.id.substring(0, 8).toUpperCase(),
          name: sub.student.name || 'Unknown',
          email: sub.student.email,
          phone: sub.student.phone || 'No phone',
          status: sub.status || 'active',
          gender: sub.student.gender || 'Not specified',
          start: sub.start_date,
          expiry: sub.end_date,
          roomName: sub.room.name || 'Unknown Room',
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
      console.error('Fetch error:', err)
      toast.error('Sync failed')
    } finally {
      setLoading(false)
      fetching.current = false
    }
  }

  useEffect(() => {
    fetchData()
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

  const uniqueRooms = Array.from(new Set(students.map(s => s.roomName).filter(Boolean)))

  const filteredItems = filter === 'requests' 
    ? requests.filter(r => (r.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'active' ? s.status === 'active' : s.status !== 'active'
        const matchesRoom = roomFilter === 'all' || s.roomName === roomFilter
        return matchesSearch && matchesFilter && matchesRoom
      })

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-500 pb-32 px-8">
      {/* Page Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5 opacity-80">Community Management</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Active Students</h2>
           <p className="text-sm font-medium text-slate-500 mt-2">Manage student accounts, memberships, and enrollment requests.</p>
        </div>
        <Link href="/manager/students/add">
          <button className="btn-primary">
            <Plus size={20} />
            <span>Add Student</span>
          </button>
        </Link>
      </header>

      {/* Control Bar: Search & Status Toggles */}
      <div className="flex flex-col xl:flex-row gap-6 items-center">
        <div className="relative flex-1 group w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={18} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="input pl-14 pr-12 w-full"
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          <div className="tab-bar p-1.5 bg-white border border-slate-200">
            {(['active', 'expired', 'requests'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-6 py-2.5 text-xs font-bold rounded-xl transition-all relative ${
                  filter === mode 
                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                    : 'text-slate-400 hover:text-on-surface'
                }`}
              >
                <span className="capitalize">{mode}</span>
                {mode === 'requests' && requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-[9px] flex items-center justify-center border-2 border-white font-bold">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {filter !== 'requests' && uniqueRooms.length > 1 && (
            <div className="bg-white p-1.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3 pr-4 group">
               <div className="w-9 h-9 bg-slate-50 flex items-center justify-center text-slate-400 rounded-xl group-focus-within:text-primary group-focus-within:bg-primary-container transition-all">
                  <Filter size={16} />
               </div>
               <select
                 value={roomFilter}
                 onChange={e => setRoomFilter(e.target.value)}
                 className="bg-transparent text-xs font-extrabold text-on-surface-variant uppercase tracking-wider outline-none cursor-pointer"
               >
                 <option value="all">Every Room</option>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filter === 'requests' ? (
            requests.map((req) => (
               <div key={req.id} className="card p-10 group flex flex-col gap-8 relative overflow-hidden h-full">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-primary/10 rounded-[1.25rem] flex items-center justify-center font-extrabold text-xl text-primary border border-primary/5">
                       {req.student?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="overflow-hidden">
                       <h3 className="font-headline font-extrabold text-lg text-on-surface truncate">{req.student?.name}</h3>
                       <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-primary">meeting_room</span> 
                          {req.room?.name}
                       </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3.5">
                     <div className="flex items-center gap-3 text-sm font-medium text-on-surface-variant opacity-80">
                        <Mail size={16} className="text-slate-300" /> {req.student?.email}
                     </div>
                     <div className="flex items-center gap-3 text-sm font-bold text-primary">
                        <Phone size={16} className="text-primary/60" /> {req.student?.phone || 'Not provided'}
                     </div>
                  </div>

                  <div className="flex gap-3 mt-auto">
                     <button 
                        disabled={acting}
                        onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                        className="flex-1 btn-primary py-3.5 rounded-2xl"
                     >
                        <ShieldCheck size={18} />
                        Review
                     </button>
                     <button 
                        disabled={acting}
                        onClick={() => handleDeclineRequest(req.id)}
                        className="w-14 h-14 bg-slate-50 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-2xl border border-slate-200 transition-all flex items-center justify-center"
                     >
                        <XCircle size={20} />
                     </button>
                  </div>
               </div>
            ))
          ) : (
            filteredItems.map((student) => (
               <div key={student.subscriptionId} className="card p-10 flex flex-col gap-8 group hover:border-primary/30 h-full">
                {/* Visual Header */}
                <div className="flex justify-between items-start">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-extrabold text-lg border-2 ${student.color}`}>
                    {student.name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border-2 ${getStatusStyle(student.status)}`}>
                       {student.status}
                    </span>
                  </div>
                </div>

                {/* Identity */}
                <div className="space-y-2">
                  <h3 className="font-headline font-extrabold text-xl text-on-surface group-hover:text-primary transition-colors">{student.name}</h3>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <ArrowRightCircle size={12} className="text-primary" />
                    {student.roomName}
                  </p>
                </div>

                {/* Details */}
                <div className="space-y-3.5">
                   <div className="flex items-center gap-3 text-sm font-medium text-slate-500 truncate">
                      <Mail size={16} className="text-slate-300 shrink-0" />
                      <span className="truncate">{student.email}</span>
                   </div>
                   <div className="flex items-center gap-3 text-sm font-bold text-primary">
                      <Phone size={16} className="text-primary/60 shrink-0" />
                      <span>{student.phone}</span>
                   </div>
                </div>

                {/* Membership Summary */}
                <div className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100 mt-auto">
                   <div className="flex justify-between items-center mb-3">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Service Period</span>
                      {student.warning && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-600 rounded text-[9px] font-extrabold uppercase">{student.warning}</span>
                      )}
                   </div>
                   <div className="flex justify-between items-center text-sm font-bold text-on-surface">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-bold text-slate-300 uppercase mb-0.5">Start</span>
                        <span>{format(new Date(student.start), 'dd MMM')}</span>
                      </div>
                      <ChevronRight size={16} className="text-slate-200" />
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] font-bold text-slate-300 uppercase mb-0.5">End</span>
                        <span>{format(new Date(student.expiry), 'dd MMM')}</span>
                      </div>
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
    </div>
  )
}
