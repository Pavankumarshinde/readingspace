'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Modal from '@/components/ui/Modal'
import { format } from 'date-fns'
import { 
  User, Mail, Phone, CheckCircle2, XCircle, ShieldCheck, 
  Plus, Search, Users, ChevronRight, UserCircle, Pencil, Trash2, Info 
} from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

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

const calculateWarning = (endDate: string) => {
  const end = new Date(endDate)
  const now = new Date()
  const diffDays = Math.ceil((end.getTime() - now.getTime()) / (1000 * 3600 * 24))
  if (diffDays <= 0) return 'Expired'
  if (diffDays <= 7) return `${diffDays} days left`
  return null
}

const colors = [
  'bg-indigo-50 text-indigo-600 border-indigo-100',
  'bg-cyan-50 text-cyan-600 border-cyan-100',
  'bg-violet-50 text-violet-600 border-violet-100',
  'bg-emerald-50 text-emerald-600 border-emerald-100'
]

export default function RoomStudentsTab({ roomId, roomName }: { roomId: string, roomName: string }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState<'active' | 'expired' | 'requests'>('active')
  const [students, setStudents] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Actions state
  const [acting, setActing] = useState(false)

  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false)
  const [selectedStudentQR, setSelectedStudentQR] = useState<any>(null)

  // Approv Modal
  const [showApproveModal, setShowApproveModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [approvalData, setApprovalData] = useState({
    seatNumber: '',
    tier: 'standard',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false)
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<any>(null)
  const [editFormData, setEditFormData] = useState({
    name: '', phone: '', seat: '', startDate: '', endDate: '', membershipType: 'digital', status: 'active'
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const { data: subsData, error: subsError } = await supabase
        .from('subscriptions')
        .select(`
          id, seat_number, tier, start_date, end_date, status, notes, membership_type,
          student:profiles!inner(id, name, email, phone, gender, membership_type)
        `)
        .eq('room_id', roomId)

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
          start: sub.start_date,
          expiry: sub.end_date,
          seatNumber: sub.seat_number || 'Unassigned',
          membershipType: sub.membership_type || sub.student.membership_type || 'digital',
          color: colors[index % colors.length]
        }))
        setStudents(formatted)
      }

      const { data: reqsData, error: reqsError } = await supabase
        .from('join_requests')
        .select(`*, student:profiles(*)`)
        .eq('room_id', roomId)
        .eq('status', 'pending')

      if (reqsError) throw reqsError
      if (reqsData) setRequests(reqsData)

    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [roomId])

  const handleDeclineRequest = async (requestId: string) => {
    setActing(true)
    try {
      const { error } = await supabase.from('join_requests').update({ status: 'rejected' }).eq('id', requestId)
      if (error) throw error
      toast.success('Request removed')
      fetchData()
    } catch (err) {
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
          room_id: roomId,
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
    } catch (err) {
      toast.error('Approval failed')
    } finally {
      setActing(false)
    }
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
        toast.error('Update failed')
      }
    } catch (e) {
      toast.error('Network connection error')
    } finally {
      setActing(false)
    }
  }

  const handleDeleteStudent = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to remove this student?')) return
    setActing(true)
    try {
      const res = await fetch('/api/manager/students/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId })
      })
      if (res.ok) {
        toast.success('Student removed')
        fetchData()
      } else {
        toast.error('Failed to remove')
      }
    } catch (e) {
      toast.error('Network error')
    } finally {
      setActing(false)
    }
  }

  const filteredItems = filter === 'requests' 
    ? requests.filter(r => (r.student?.name || '').toLowerCase().includes(searchTerm.toLowerCase()))
    : students.filter(s => {
        const matchesSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase()) || s.email.toLowerCase().includes(searchTerm.toLowerCase())
        const matchesFilter = filter === 'active' ? s.status === 'active' : s.status !== 'active'
        return matchesSearch && matchesFilter
      })

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Actions */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1 w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary" size={18} />
          <input
            type="text"
            placeholder="Search reader..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-white rounded-xl shadow-sm border border-outline-variant/10 text-sm outline-none focus:ring-2 focus:ring-primary/20"
          />
        </div>
        
        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
            {(['active', 'expired', 'requests'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-4 py-2 text-[10px] font-bold rounded-lg transition-all relative uppercase tracking-widest whitespace-nowrap ${
                  filter === mode 
                    ? 'bg-surface-container-lowest text-primary shadow-sm font-black border border-outline-variant/10' 
                    : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span>{mode}</span>
                {mode === 'requests' && requests.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-primary text-white rounded font-extrabold text-[8px]">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          <a href={`/manager/students/add?room=${roomId}`} className="shrink-0 flex items-center justify-center w-10 h-10 md:w-auto md:px-4 md:py-2 bg-primary text-white rounded-xl md:rounded-lg shadow-sm hover:opacity-90 transition-all font-bold text-[10px] uppercase tracking-widest gap-2">
            <Plus size={16} />
            <span className="hidden md:inline">Enroll Reader</span>
          </a>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center"><div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div></div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/5 rounded-2xl">
          <Users className="mx-auto text-on-surface-variant/20 mb-3" size={32} />
          <p className="font-bold text-on-surface-variant">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filter === 'requests' ? (
            filteredItems.map((req) => (
               <div key={req.id} className="p-5 bg-white border border-outline-variant/10 rounded-2xl shadow-sm flex flex-col gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-black text-xl text-primary">
                       {req.student?.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                       <h3 className="font-bold text-base text-on-surface">{req.student?.name}</h3>
                       <p className="text-[10px] text-on-surface-variant/60">{req.student?.email}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-2 border-t border-outline-variant/5">
                     <button 
                        disabled={acting}
                        onClick={() => { setSelectedRequest(req); setShowApproveModal(true); }}
                        className="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-bold"
                     >
                        Review
                     </button>
                     <button 
                        disabled={acting}
                        onClick={() => handleDeclineRequest(req.id)}
                        className="w-10 flex items-center justify-center bg-error/10 text-error rounded-lg"
                     >
                        <XCircle size={18} />
                     </button>
                  </div>
               </div>
            ))
          ) : (
            filteredItems.map((student) => (
               <div key={student.subscriptionId} className="p-5 bg-white border border-outline-variant/10 rounded-2xl shadow-sm flex flex-col gap-4 relative">
                  <div className="flex justify-between items-start">
                    <div>
                       <h3 className="font-bold text-base text-on-surface uppercase italic">{student.name}</h3>
                       <div className="flex items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getMemberTypeStyle(student.membershipType)}`}>
                             {student.membershipType}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${getStatusStyle(student.status)}`}>
                             {student.status}
                          </span>
                       </div>
                    </div>
                    <div className="text-right">
                       <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase">Seat</span>
                       <p className="font-black text-lg text-primary">{student.seatNumber}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-[10px] font-bold text-secondary uppercase bg-surface-container-low p-2 rounded-lg">
                    <span>{format(new Date(student.start), 'dd MMM')}</span>
                    <ChevronRight size={12} className="text-outline/40" />
                    <span>{format(new Date(student.expiry), 'dd MMM')}</span>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                     <button 
                        onClick={() => { setSelectedStudentQR(student); setShowQRModal(true); }}
                        className="text-[10px] font-bold text-primary uppercase hover:underline"
                     >
                        View QR Pass
                     </button>
                     <div className="flex gap-2">
                        <button onClick={() => { setSelectedStudentForEdit(student); setEditFormData({ name: student.name, phone: student.phone === 'No phone' ? '' : student.phone, seat: student.seatNumber, startDate: student.start, endDate: student.expiry, membershipType: student.membershipType, status: student.status }); setShowEditModal(true); }} className="p-1.5 text-on-surface-variant/40 hover:text-primary"><Pencil size={14} /></button>
                        <button onClick={() => handleDeleteStudent(student.subscriptionId)} className="p-1.5 text-on-surface-variant/40 hover:text-error"><Trash2 size={14} /></button>
                     </div>
                  </div>
               </div>
            ))
          )}
        </div>
      )}

      {/* Review Request Modal */}
      {showApproveModal && selectedRequest && (
        <Modal open={showApproveModal} onClose={() => setShowApproveModal(false)} title="Approve Request">
          <form onSubmit={handleApproveSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant">Seat</label>
                <input required type="text" className="input mt-1" value={approvalData.seatNumber} onChange={e => setApprovalData({...approvalData, seatNumber: e.target.value})} />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">Tier</label>
                <select className="input mt-1" value={approvalData.tier} onChange={e => setApprovalData({...approvalData, tier: e.target.value})}>
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                 <label className="text-xs font-bold text-on-surface-variant">Start</label>
                 <input type="date" required className="input mt-1" value={approvalData.startDate} onChange={e => setApprovalData({...approvalData, startDate: e.target.value})} />
              </div>
               <div>
                 <label className="text-xs font-bold text-on-surface-variant">End</label>
                 <input type="date" required className="input mt-1" value={approvalData.endDate} onChange={e => setApprovalData({...approvalData, endDate: e.target.value})} />
              </div>
            </div>
            <button disabled={acting} type="submit" className="w-full btn-primary mt-2">Approve</button>
          </form>
        </Modal>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
         <Modal open={showEditModal} onClose={() => setShowEditModal(false)} title="Edit Student">
            <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                   <label className="text-xs font-bold text-on-surface-variant">Name</label>
                   <input required type="text" className="input mt-1" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} />
                </div>
                <div className="col-span-2">
                   <label className="text-xs font-bold text-on-surface-variant">Seat</label>
                   <input required type="text" className="input mt-1" value={editFormData.seat} onChange={e => setEditFormData({...editFormData, seat: e.target.value})} />
                </div>
                <div>
                  <label className="text-xs font-bold text-on-surface-variant">Membership Type</label>
                  <select className="input mt-1" value={editFormData.membershipType} onChange={e => setEditFormData({...editFormData, membershipType: e.target.value})}>
                    <option value="digital">Digital</option>
                    <option value="managed">Managed</option>
                  </select>
                </div>
                 <div>
                  <label className="text-xs font-bold text-on-surface-variant">Status</label>
                  <select className="input mt-1" value={editFormData.status} onChange={e => setEditFormData({...editFormData, status: e.target.value})}>
                    <option value="active">Active</option>
                    <option value="expired">Expired</option>
                    <option value="due">Due</option>
                  </select>
                </div>
                <div>
                   <label className="text-xs font-bold text-on-surface-variant">Start Date</label>
                   <input type="date" required className="input mt-1" value={editFormData.startDate} onChange={e => setEditFormData({...editFormData, startDate: e.target.value})} />
                </div>
                <div>
                   <label className="text-xs font-bold text-on-surface-variant">End Date</label>
                   <input type="date" required className="input mt-1" value={editFormData.endDate} onChange={e => setEditFormData({...editFormData, endDate: e.target.value})} />
                </div>
              </div>
              <button disabled={acting} type="submit" className="w-full btn-primary mt-2">Update</button>
            </form>
         </Modal>
      )}

      {/* QR Modal */}
      {showQRModal && selectedStudentQR && (
         <Modal open={showQRModal} onClose={() => setShowQRModal(false)} title="View QR Pass">
            <div className="flex flex-col items-center py-6 gap-4">
              <h3 className="font-bold text-xl">{selectedStudentQR.name}</h3>
              <div className="p-4 bg-white rounded-2xl shadow-lg border border-slate-100">
                <QRCodeSVG value={JSON.stringify({ type: 'access_verify', uid: selectedStudentQR.studentUid })} size={200} />
              </div>
              <p className="text-xs text-on-surface-variant/50 uppercase tracking-widest font-bold mt-2 text-center">Scan at room entrance</p>
            </div>
         </Modal>
      )}
    </div>
  )
}
