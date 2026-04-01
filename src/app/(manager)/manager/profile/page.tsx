'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Edit, Shield, LogOut, Building } from 'lucide-react'

export default function SpaceProfile() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [radius, setRadius] = useState(200)

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true)
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          router.push('/login')
          return
        }

        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (data) {
          setProfile(data)
        }
      } catch (error) {
        console.error(error)
        toast.error('Failed to load profile')
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface items-center justify-center text-outline">
        <span className="material-symbols-outlined animate-spin mr-2">progress_activity</span>
        Syncing Profile...
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header>
        <h2 className="section-header text-primary">Operational Profile</h2>
        <p className="section-sub mt-1">Management identity & radius settings</p>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
           {/* Business Identity */}
           <section className="space-y-4">
              <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Organization</h3>
              <div className="card p-6 relative overflow-hidden group">
                 <div className="flex items-center gap-5">
                    <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center border border-primary/10 transition-transform group-hover:scale-105">
                       <span className="material-symbols-outlined text-2xl">corporate_fare</span>
                    </div>
                    <div className="flex flex-col">
                       <h2 className="font-headline font-bold text-base text-on-surface leading-tight">
                         {profile?.business_name || 'Organization Space'}
                       </h2>
                       <p className="font-bold text-[9px] text-outline uppercase tracking-widest mt-1 opacity-60">Verified Hub Manager</p>
                    </div>
                 </div>
              </div>
           </section>

           {/* Contact Details */}
           <section className="space-y-4">
              <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Primary Liaison</h3>
              <div className="card divide-y divide-outline-variant/10 overflow-hidden">
                 {[
                    { label: 'Identity', val: profile?.name, icon: 'person' },
                    { label: 'Communications', val: profile?.email, icon: 'alternate_email' },
                    { label: 'Hotline', val: profile?.phone || 'Not provided', icon: 'call' }
                 ].map((item, i) => (
                    <div key={i} className="p-4 flex items-center justify-between hover:bg-surface-container-low transition-colors group">
                       <div className="flex items-center gap-4">
                          <span className="material-symbols-outlined text-outline/40 icon-sm transition-colors group-hover:text-primary">{item.icon}</span>
                          <div>
                             <p className="text-[8px] font-bold text-outline/50 uppercase tracking-widest">{item.label}</p>
                             <p className="text-xs font-bold text-on-surface mt-0.5">{item.val}</p>
                          </div>
                       </div>
                       <button className="btn-ghost scale-75 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="material-symbols-outlined icon-xs">edit</span>
                       </button>
                    </div>
                 ))}
              </div>
           </section>

           {/* Security Area */}
           <section className="space-y-4">
              <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Session Protocol</h3>
              <div className="flex gap-3">
                 <button 
                   onClick={handleLogout}
                   className="flex-1 flex items-center justify-center gap-2 py-3 border border-error/20 text-error bg-error/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-error/10 transition-all active:scale-[0.98]"
                 >
                   <span className="material-symbols-outlined icon-xs">logout</span>
                   <span>Terminate Session</span>
                 </button>
                 <button className="flex-1 flex items-center justify-center gap-2 py-3 border border-outline-variant/30 text-outline bg-surface-container-low rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-surface-container transition-all active:scale-[0.98]">
                    <span className="material-symbols-outlined icon-xs">security</span>
                    <span>Guard Panel</span>
                 </button>
              </div>
              <p className="text-center text-[8px] text-outline/40 font-mono uppercase tracking-widest">
                ReadingSpace Core v1.2.x // Terminal RA-01
              </p>
           </section>
        </div>

        <div className="space-y-8">
           {/* Geofencing Section */}
           <section className="space-y-4">
              <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Operational Boundary</h3>
              <div className="card p-6 space-y-8">
                 <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                       <h3 className="font-bold text-xs text-on-surface">Precision Radius</h3>
                       <p className="text-[9px] font-bold text-outline uppercase tracking-widest mt-1 opacity-60">Attendance geofence strictness</p>
                    </div>
                    <span className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-bold font-mono tracking-widest">
                       {radius} MTRS
                    </span>
                 </div>
                 
                 <div className="px-2">
                    <input 
                      type="range" 
                      min="50" 
                      max="1000" 
                      step="50"
                      value={radius}
                      onChange={(e) => setRadius(parseInt(e.target.value))}
                      className="w-full h-1 bg-surface-container-highest rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <div className="flex justify-between mt-3 text-[8px] font-bold text-outline/40 uppercase tracking-widest">
                       <span>Tactical (50m)</span>
                       <span>Expansion (1km)</span>
                    </div>
                 </div>
              </div>
           </section>

           {/* Location Section */}
           <section className="space-y-4">
              <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Physical Presence</h3>
              <div className="card relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl">location_on</span>
                 </div>
                 <div className="p-6">
                    <p className="text-[8px] font-bold text-outline/50 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                       <span className="material-symbols-outlined icon-xs text-primary">share_location</span>
                       Registered Address
                    </p>
                    <p className="text-[11px] font-bold text-on-surface uppercase tracking-widest leading-relaxed max-w-[80%]">
                       {profile?.address || 'Deployment coordinates not set'}
                    </p>
                    <button className="mt-6 text-primary text-[9px] font-bold uppercase tracking-widest hover:underline decoration-2 underline-offset-4">
                       Relocate Station
                    </button>
                 </div>
              </div>
           </section>
        </div>
      </main>
    </div>
  )
}

