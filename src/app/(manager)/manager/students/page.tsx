'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { Calendar, User, Mail, Phone, MapPin, Key, Check, X, ShieldCheck, Plus, Search, Filter, Group, PersonStanding, AlertCircle } from 'lucide-react'

// Helper functions for formatting
const getStatusStyle = (status: string) => {
  switch (status) {
    case 'active': return 'bg-emerald-100 text-emerald-700'
    case 'due': return 'bg-amber-100 text-amber-700'
    case 'expired': 
    case 'overdue': return 'bg-rose-100 text-rose-700'
    default: return 'bg-slate-100 text-slate-600'
  }
}

const colors = [
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-purple-100 text-purple-700',
  'bg-teal-100 text-teal-700'
]

const calculateWarning = (endDate: string) => {
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))
  if (diffDays <= 0) return 'Expired'
  if (diffDays <= 7) return `Expiring in ${diffDays} days`
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

  // Final Action Loading States
  const [acting, setActing] = useState(false)

  const fetchData = async () => {
    if (fetching.current) return
    fetching.current = true
    setLoading(true)
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      if (!user) return

      // Fetch Subscriptions (Active/Expired)
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

      // Fetch Join Requests
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
      if (err.name === 'NavigatorLockAcquireTimeoutError' || err.message?.includes('Lock')) {
        console.warn('Supabase auth lock contention - ignoring second call')
        return
      }
      console.error('Fetch error:', err)
      toast.error('Sync failed: ' + err.message)
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
       toast.success('Request declined')
       fetchData()
     } catch (err: any) {
       toast.error('Failed to reject: ' + err.message)
     } finally {
       setActing(false)
     }
  }

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRequest) return
    setActing(true)

    try {
      // 1. Create Subscription
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

      // 2. Update Join Request
      const { error: reqUpdateError } = await supabase
        .from('join_requests')
        .update({ status: 'accepted' })
        .eq('id', selectedRequest.id)

      if (reqUpdateError) throw reqUpdateError

      toast.success('Student membership activated!')
      setShowApproveModal(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Approval failed')
    } finally {
      setActing(false)
    }
  }

  const handleUpdatePaymentStatus = async (subscriptionId: string, currentStatus: string) => {
    const cycle: Record<string, string> = { paid: 'due', due: 'overdue', overdue: 'paid' }
    const nextStatus = cycle[currentStatus] || 'due'
    try {
      const res = await fetch('/api/manager/students/payment-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId, paymentStatus: nextStatus })
      })
      if (res.ok) {
        setStudents(prev => prev.map(s => s.subscriptionId === subscriptionId ? { ...s, paymentStatus: nextStatus } : s))
        toast.success(`Payment marked as ${nextStatus}`)
      } else {
        toast.error('Failed to update payment status')
      }
    } catch {
      toast.error('Network error')
    }
  }

  const uniqueRooms = Array.from(new Set(students.map(s => s.roomName).filter(Boolean)))

  const filteredItems = filter === 'requests' 
    ? requests.filter(r => (r.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (r.student?.email || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'active' ? s.status === 'active' : s.status !== 'active'
        const matchesRoom = roomFilter === 'all' || s.roomName === roomFilter
        return matchesSearch && matchesFilter && matchesRoom
      })

  return (
    <div className="space-y-5 animate-in fade-in duration-500">

      {/* Top bar: Heading + Add button */}
      <header className="flex items-start justify-between">
        <div>
          <h2 className="section-header text-primary">Student Directory</h2>
          <p className="section-sub mt-0.5">Manage members and hall access requests</p>
        </div>
        <Link href="/manager/students/add">
          <button className="btn-sm-minimal bg-primary text-on-primary border-none hover:bg-primary-container h-8 px-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined icon-xs">add</span>
            <span className="hidden sm:inline">Add Student</span>
          </button>
        </Link>
      </header>

      {/* Search */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline/50 text-base pointer-events-none select-none">search</span>
        <input
          type="text"
          placeholder="Search by name or email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl pl-10 pr-10 py-2.5 text-sm text-on-surface placeholder:text-outline/40 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-outline/50 hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        )}
      </div>

      {/* Filters row: Status tabs (centered) + Room dropdown */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        {/* Status tabs — centered */}
        <div className="tab-bar flex-1 flex justify-center">
          <button
            onClick={() => setFilter('active')}
            className={`tab-bar-item !py-1.5 !px-4 ${filter === 'active' ? 'active' : ''}`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter('expired')}
            className={`tab-bar-item !py-1.5 !px-4 ${filter === 'expired' ? 'active' : ''}`}
          >
            Expired
          </button>
          <button
            onClick={() => setFilter('requests')}
            className={`tab-bar-item !py-1.5 !px-4 relative ${filter === 'requests' ? 'active' : ''}`}
          >
            Requests
            {requests.length > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-error text-white rounded-full text-[7px] flex items-center justify-center border-2 border-surface font-black">{requests.length}</span>
            )}
          </button>
        </div>

        {/* Room filter dropdown */}
        {filter !== 'requests' && uniqueRooms.length > 1 && (
          <div className="relative shrink-0">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline/50 text-sm pointer-events-none">meeting_room</span>
            <select
              value={roomFilter}
              onChange={e => setRoomFilter(e.target.value)}
              className="pl-8 pr-8 h-9 bg-surface-container-low border border-outline-variant/30 rounded-xl text-xs font-medium text-on-surface appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
            >
              <option value="all">All Rooms</option>
              {uniqueRooms.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline/50 text-sm pointer-events-none">expand_more</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-outline/50">
          <span className="material-symbols-outlined animate-spin mb-3 font-light">progress_activity</span>
          <span className="text-xs font-bold uppercase tracking-widest">Hydrating records...</span>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 bg-surface-container-low rounded-2xl border border-outline-variant/30 text-center">
          <span className="material-symbols-outlined text-5xl mb-4 text-outline/20 font-light">person_off</span>
          <h3 className="font-headline font-semibold text-lg text-on-surface">No records found</h3>
          <p className="text-xs text-on-surface-variant mt-2 opacity-70">Adjust filters or refine search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filter === 'requests' ? (
            requests.map((req) => (
              <div key={req.id} className="card p-5 group flex flex-col gap-6 relative overflow-hidden transition-all hover:shadow-md">
                 <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center font-bold text-lg text-primary border border-outline-variant/30">
                       {req.student?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div className="overflow-hidden">
                       <h3 className="font-headline font-bold text-sm text-on-surface truncate">{req.student?.name}</h3>
                       <p className="text-[10px] font-bold text-outline uppercase tracking-widest flex items-center gap-1.5 mt-1">
                          <span className="material-symbols-outlined icon-xs text-primary">meeting_room</span> {req.room?.name}
                       </p>
                    </div>
                 </div>
                 <div className="space-y-2">
                    <div className="flex items-center gap-3 text-on-surface-variant text-[11px] font-bold">
                       <span className="material-symbols-outlined icon-xs text-outline/40">mail</span> {req.student?.email}
                    </div>
                    <div className="flex items-center gap-3 text-on-surface-variant text-[11px] font-bold">
                       <span className="material-symbols-outlined icon-xs text-outline/40">call</span> {req.student?.phone || 'No phone'}
                    </div>
                 </div>
                 <div className="flex gap-2">
                    <button 
                       disabled={acting}
                       onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                       className="flex-1 btn-primary !py-2 !text-[11px] !border-none !gap-2"
                    >
                       <span className="material-symbols-outlined icon-xs">check</span> Accept
                    </button>
                    <button 
                       disabled={acting}
                       onClick={() => handleDeclineRequest(req.id)}
                       className="btn-ghost bg-error/5 text-error w-10 h-10 flex items-center justify-center rounded-lg border border-error/10 hover:bg-error/10 transition-all disabled:opacity-50"
                    >
                       <span className="material-symbols-outlined icon-sm">close</span>
                    </button>
                 </div>
              </div>
            ))
          ) : (
            filteredItems.map((student) => (
              <div key={student.subscriptionId} className="card p-5 flex flex-col gap-4 group hover:border-primary/20 transition-all shadow-sm">
                {/* Top row: Avatar + Status badges */}
                <div className="flex justify-between items-start">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base ${student.color} border border-outline-variant/10 shrink-0`}>
                    {student.name.split(' ').map((n: any) => n[0]).join('').substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Payment status badge — clickable to cycle */}
                    <button
                      onClick={() => handleUpdatePaymentStatus(student.subscriptionId, student.paymentStatus)}
                      title="Click to cycle payment status"
                      className={`px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border transition-all hover:scale-105 active:scale-95 cursor-pointer ${
                        student.paymentStatus === 'paid'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : student.paymentStatus === 'overdue'
                          ? 'bg-rose-50 text-rose-600 border-rose-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {student.paymentStatus === 'paid' ? '✓ Paid' : student.paymentStatus === 'overdue' ? '⚠ Overdue' : '● Due'}
                    </button>
                    {/* Subscription status */}
                    <span className={`px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest border ${
                      student.status === 'active'
                        ? 'bg-secondary/5 text-secondary border-secondary/20'
                        : 'bg-error/5 text-error border-error/20'
                    }`}>
                      {student.status}
                    </span>
                  </div>
                </div>

                {/* Name + Room */}
                <div>
                  <h3 className="font-headline font-bold text-sm text-on-surface group-hover:text-primary transition-colors">{student.name}</h3>
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="material-symbols-outlined icon-xs text-primary" style={{fontSize:'11px'}}>meeting_room</span>
                    <p className="text-[9px] font-bold text-primary/70 uppercase tracking-widest truncate">{student.roomName}</p>
                  </div>
                </div>

                {/* Contact info */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5 text-[11px] font-medium text-on-surface-variant truncate">
                    <span className="material-symbols-outlined icon-xs text-outline/40">mail</span>
                    <span className="truncate">{student.email}</span>
                  </div>
                  <div className="flex items-center gap-2.5 text-[11px] font-medium text-on-surface-variant">
                    <span className="material-symbols-outlined icon-xs text-outline/40">call</span>
                    <span className={student.phone ? '' : 'text-outline/30 italic'}>
                      {student.phone || 'No phone'}
                    </span>
                  </div>
                </div>

                {/* Member cycle */}
                <div className="p-3 bg-surface-container-low/60 rounded-xl border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[8px] font-bold text-outline uppercase tracking-widest">Member Cycle</span>
                    {student.warning && <span className="bg-error text-white px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-widest">{student.warning}</span>}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-on-surface font-mono">
                    <span>{new Date(student.start).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                    <span className="material-symbols-outlined icon-xs text-outline/20">trending_flat</span>
                    <span>{new Date(student.expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Floating Add Button For Mobile Case */}
      <Link href="/manager/students/add" className="fixed bottom-24 right-6 md:hidden z-40">
         <button className="w-12 h-12 bg-primary text-on-primary rounded-xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
            <span className="material-symbols-outlined">add</span>
         </button>
      </Link>

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
        <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Finalize Registration">
           <form onSubmit={handleApproveSubmit} className="space-y-6 pt-4">
              <div className="flex items-center gap-4 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                 <div className="w-12 h-12 bg-surface-container-highest rounded-xl flex items-center justify-center font-bold text-lg text-primary border border-outline-variant/30 shadow-sm">
                    {selectedRequest.student?.name?.[0]?.toUpperCase() || 'S'}
                 </div>
                 <div>
                    <h4 className="font-headline font-bold text-sm text-on-surface">{selectedRequest.student?.name}</h4>
                    <p className="text-[10px] font-bold text-outline uppercase tracking-widest mt-0.5">Request for {selectedRequest.room?.name}</p>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-1.5 ml-1">Assign Seat</label>
                    <input 
                       type="text" 
                       required
                       placeholder="e.g. B-12"
                       value={approvalData.seatNumber}
                       onChange={e => setApprovalData({...approvalData, seatNumber: e.target.value})}
                       className="input py-2 text-xs font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-1.5 ml-1">Member Tier</label>
                    <select 
                       value={approvalData.tier}
                       onChange={e => setApprovalData({...approvalData, tier: e.target.value})}
                       className="input py-2 text-xs font-bold appearance-none cursor-pointer"
                    >
                       <option value="standard">Standard</option>
                       <option value="premium">Premium</option>
                    </select>
                 </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-1.5 ml-1">Start Date</label>
                    <input 
                       type="date" 
                       required
                       value={approvalData.startDate}
                       onChange={e => setApprovalData({...approvalData, startDate: e.target.value})}
                       className="input py-2 text-xs font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-[9px] font-bold text-outline uppercase tracking-widest block mb-1.5 ml-1">End Date</label>
                    <input 
                       type="date" 
                       required
                       value={approvalData.endDate}
                       onChange={e => setApprovalData({...approvalData, endDate: e.target.value})}
                       className="input py-2 text-xs font-bold"
                    />
                 </div>
              </div>

              <div className="flex gap-3 pt-4">
                 <button 
                    disabled={acting}
                    type="submit" 
                    className="flex-[2] btn-primary !py-3 !text-[11px] !border-none"
                 >
                    {acting ? 'Processing...' : 'Confirm Activation'}
                 </button>
                 <button 
                    type="button"
                    onClick={() => setShowApproveModal(false)}
                    className="flex-1 btn-ghost bg-surface-container-low !py-3 !text-[11px]"
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
