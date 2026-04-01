'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, UserPlus, Mail, Phone, Calendar, Armchair, Building, Clock, Send, ShieldCheck, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createClient } from '@/lib/supabase/client'

export default function AddStudent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [rooms, setRooms] = useState<{ id: string, name: string }[]>([])
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    room: '',
    seat: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: '1', // months
    sendInvite: true
  })

  useEffect(() => {
    const fetchRooms = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      
      const { data } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('manager_id', user.id)
      
      if (data) {
        setRooms(data)
        if (data.length > 0) {
          setFormData(prev => ({ ...prev, room: data[0].id }))
        }
      }
    }
    fetchRooms()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    try {
      const res = await fetch('/api/manager/students/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || 'Failed to add student')
      } else {
        toast.success('Registration complete!')
        router.back()
      }
    } catch (err) {
      toast.error('Network connectivity issues')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Precision Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-8 h-18 flex items-center justify-between w-full">
          <div className="flex items-center gap-6">
            <button 
              onClick={() => router.back()}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary/30 hover:bg-primary/5 transition-all"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="flex flex-col">
              <h1 className="text-xl font-extrabold text-on-surface tracking-tight leading-none">Enroll Student</h1>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1.5 opacity-80">Manual Registration Portal</p>
            </div>
          </div>
          <button 
            form="enroll-form"
            type="submit"
            disabled={loading}
            className="btn-primary py-2.5 px-6 rounded-2xl shadow-xl shadow-primary/20"
          >
            <Save size={18} />
            <span>Finish</span>
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 pt-12 pb-32 w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <form id="enroll-form" onSubmit={handleSave} className="space-y-10">
          
          {/* Progress Indicator (Visual) */}
          <div className="flex items-center gap-4 px-2">
             <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs font-bold shadow-lg shadow-primary/20">1</div>
                <span className="text-xs font-extrabold text-on-surface">Identity</span>
             </div>
             <div className="flex-1 h-px bg-slate-200 mx-2"></div>
             <div className="flex items-center gap-3 opacity-40">
                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-xs font-bold">2</div>
                <span className="text-xs font-extrabold text-slate-400">Membership</span>
             </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Input Forms */}
            <div className="lg:col-span-12 space-y-10">
              
              {/* Profile Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                   <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                      <UserPlus size={18} />
                   </div>
                   <h2 className="text-xl font-extrabold text-on-surface tracking-tight">Personal Details</h2>
                </div>
                
                <div className="card p-10 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="md:col-span-2 space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Full Identity Name</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                            <ShieldCheck size={20} />
                         </div>
                         <input 
                           type="text" 
                           required
                           className="input pl-12" 
                           placeholder="e.g. Vikram Batra"
                           value={formData.name}
                           onChange={(e) => setFormData({...formData, name: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Primary Email</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                            <Mail size={18} />
                         </div>
                         <input 
                           type="email" 
                           required
                           className="input pl-12" 
                           placeholder="student@domain.com"
                           value={formData.email}
                           onChange={(e) => setFormData({...formData, email: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Contact Number</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                            <Phone size={18} />
                         </div>
                         <input 
                           type="tel" 
                           className="input pl-12" 
                           placeholder="+91 XXXXX XXXXX"
                           value={formData.phone}
                           onChange={(e) => setFormData({...formData, phone: e.target.value})}
                         />
                      </div>
                   </div>
                </div>
              </section>

              {/* Assignment Section */}
              <section className="space-y-6">
                <div className="flex items-center gap-3 px-1">
                   <div className="w-9 h-9 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/5">
                      <Armchair size={18} />
                   </div>
                   <h2 className="text-xl font-extrabold text-on-surface tracking-tight">Membership Assignment</h2>
                </div>
                
                <div className="card p-10 bg-white grid grid-cols-1 md:grid-cols-2 gap-8">
                   <div className="md:col-span-2 space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Reading Room Node</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors pointer-events-none">
                            <Building size={18} />
                         </div>
                         <select 
                           required
                           className="input pl-12 cursor-pointer font-bold pr-10 appearance-none bg-no-repeat bg-[right_1.25rem_center] bg-[length:16px_16px]"
                           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='currentColor'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")` }}
                           value={formData.room}
                           onChange={(e) => setFormData({...formData, room: e.target.value})}
                         >
                            {rooms.length === 0 && <option value="">Loading active rooms...</option>}
                            {rooms.map((room) => (
                               <option key={room.id} value={room.id}>{room.name}</option>
                            ))}
                         </select>
                      </div>
                   </div>

                   <div className="space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Allocated Seat Code</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                            <Clock size={16} />
                         </div>
                         <input 
                           type="text" 
                           className="input pl-12 font-mono uppercase tracking-widest" 
                           placeholder="e.g. S-42"
                           value={formData.seat}
                           onChange={(e) => setFormData({...formData, seat: e.target.value})}
                         />
                      </div>
                   </div>

                   <div className="space-y-2.5">
                      <label className="text-xs font-bold text-on-surface-variant ml-1">Subscription Cycle (Months)</label>
                      <div className="relative group">
                         <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors">
                            <Calendar size={18} />
                         </div>
                         <input 
                           type="number" 
                           required
                           className="input pl-12 font-bold" 
                           min="1"
                           value={formData.duration}
                           onChange={(e) => setFormData({...formData, duration: e.target.value})}
                         />
                      </div>
                   </div>
                </div>
              </section>

              {/* Notification Banner */}
              <section className="bg-gradient-to-br from-primary to-indigo-700 p-8 rounded-[2.5rem] shadow-2xl shadow-primary/20 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden group">
                 {/* Decorative */}
                 <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-32 -mt-32 transition-transform group-hover:scale-125" />
                 
                 <div className="flex items-center gap-6 relative z-10">
                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-white border border-white/10">
                       <Send size={28} />
                    </div>
                    <div>
                       <h3 className="font-extrabold text-white text-xl leading-none">Automated Onboarding</h3>
                       <p className="text-sm font-medium text-white/70 mt-2">Send instant magic link for initial profile configuration.</p>
                    </div>
                 </div>

                 <label className="relative inline-flex items-center cursor-pointer relative z-10">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={formData.sendInvite} 
                      onChange={(e) => setFormData({...formData, sendInvite: e.target.checked})}
                    />
                    <div className="w-16 h-9 bg-white/10 backdrop-blur-md rounded-full border border-white/20 peer peer-checked:bg-white peer-checked:border-white transition-all after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:rounded-full after:h-7 after:w-7 after:transition-all peer-checked:after:translate-x-7 peer-checked:after:bg-primary shadow-xl"></div>
                 </label>
              </section>

              <button 
                 type="submit" 
                 disabled={loading}
                 className="btn-primary w-full py-5 rounded-[2rem] text-lg lg:hidden"
              >
                 <CheckCircle2 size={22} />
                 <span>{loading ? 'Processing Registration...' : 'Complete Enrollment'}</span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}
