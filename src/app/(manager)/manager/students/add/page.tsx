'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Save, UserPlus, Info, Mail, Phone, Calendar, Armchair, Building, Clock } from 'lucide-react'
import toast from 'react-hot-toast'

export default function AddStudent() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    // Simulate API call
    setTimeout(() => {
      toast.success('Student added successfully!')
      router.back()
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface sticky top-0 z-50 flex items-center justify-between px-6 py-4 w-full border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()}
            className="btn-ghost material-symbols-outlined text-primary"
          >
            arrow_back
          </button>
          <h1 className="text-xl font-bold font-headline text-primary tracking-tight italic">Enroll New Scholar</h1>
        </div>
        <button 
          form="enroll-form"
          type="submit"
          className="w-10 h-10 rounded-full bg-primary text-on-primary flex-center shadow-lg shadow-primary/20 hover:scale-105 transition-all"
        >
          <Save size={20} />
        </button>
      </header>

      <main className="max-w-xl mx-auto px-6 pt-8 pb-32 w-full space-y-8">
        <form id="enroll-form" onSubmit={handleSave} className="space-y-8">
          {/* Section 1: Basic Info */}
          <section className="space-y-4">
            <h2 className="text-[12px] font-bold text-outline uppercase tracking-[0.2em] px-1">Basic Profile</h2>
            <div className="card p-6 space-y-6 shadow-sm border-outline-variant/10">
               <div>
                  <label className="input-label">Full Name</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                     <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <UserPlus size={18} />
                     </div>
                     <input 
                       type="text" 
                       required
                       className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold" 
                       placeholder="e.g. Arjun Reddy"
                       value={formData.name}
                       onChange={(e) => setFormData({...formData, name: e.target.value})}
                     />
                  </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="input-label">Email Address</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                       <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                          <Mail size={18} />
                       </div>
                       <input 
                         type="email" 
                         required
                         className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold" 
                         placeholder="scholar@example.com"
                         value={formData.email}
                         onChange={(e) => setFormData({...formData, email: e.target.value})}
                       />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Phone Number</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                       <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                          <Phone size={18} />
                       </div>
                       <input 
                         type="tel" 
                         className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold" 
                         placeholder="+91 98765 43210"
                         value={formData.phone}
                         onChange={(e) => setFormData({...formData, phone: e.target.value})}
                       />
                    </div>
                  </div>
               </div>
            </div>
          </section>

          {/* Section 2: Seat & Duration */}
          <section className="space-y-4">
            <h2 className="text-[12px] font-bold text-outline uppercase tracking-[0.2em] px-1">Assignment & Subscription</h2>
            <div className="card p-6 space-y-6 shadow-sm border-outline-variant/10">
               <div>
                  <label className="input-label">Select Reading Room</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                     <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <Building size={18} />
                     </div>
                     <select 
                       className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold appearance-none pr-8"
                       value={formData.room}
                       onChange={(e) => setFormData({...formData, room: e.target.value})}
                     >
                        <option value="">Choose a room...</option>
                        <option value="1">Sunrise Reading Hall</option>
                        <option value="2">The Quiet Zone</option>
                     </select>
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="input-label">Seat Number</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                       <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                          <Armchair size={18} />
                       </div>
                       <input 
                         type="text" 
                         className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold uppercase" 
                         placeholder="e.g. B-12"
                         value={formData.seat}
                         onChange={(e) => setFormData({...formData, seat: e.target.value})}
                       />
                    </div>
                  </div>
                  <div>
                    <label className="input-label">Duration (Months)</label>
                    <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-xl border border-outline-variant/10">
                       <div className="w-10 h-10 rounded-lg bg-surface-container-lowest flex-center text-primary shadow-sm">
                          <Clock size={18} />
                       </div>
                       <input 
                         type="number" 
                         className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-semibold" 
                         min="1"
                         value={formData.duration}
                         onChange={(e) => setFormData({...formData, duration: e.target.value})}
                       />
                    </div>
                  </div>
               </div>
            </div>
          </section>

          {/* Section 3: Notification Toggle */}
          <section className="bg-primary/5 p-6 rounded-3xl border border-primary/10 flex items-center justify-between gap-4">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary flex-center text-white shadow-lg shadow-primary/20">
                   <Mail size={24} />
                </div>
                <div>
                   <h3 className="font-bold text-primary text-[15px]">Send Invite Email</h3>
                   <p className="text-[11px] font-medium text-on-surface-variant font-medium">Automatic magic link for onboarding</p>
                </div>
             </div>
             <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={formData.sendInvite} 
                  onChange={(e) => setFormData({...formData, sendInvite: e.target.checked})}
                />
                <div className="w-11 h-6 bg-surface-container rounded-full peer peer-checked:after:translate-x-full peer-checked:after:bg-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-outline-variant after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-secondary"></div>
             </label>
          </section>

          <button 
             type="submit" 
             disabled={loading}
             className="btn-gradient w-full py-5 rounded-2xl text-[16px]"
          >
             {loading ? 'Processing Enrollment...' : 'Enroll Scholar'}
          </button>
        </form>
      </main>
    </div>
  )
}
