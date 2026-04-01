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
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    business_name: '',
    phone: '',
    address: '',
    bio: ''
  })

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
          setFormData({
            name: data.name || '',
            business_name: data.business_name || '',
            phone: data.phone || '',
            address: data.address || '',
            bio: data.bio || ''
          })
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

  const handleSave = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          business_name: formData.business_name,
          phone: formData.phone,
          address: formData.address,
          bio: formData.bio
        })
        .eq('id', user.id)

      if (error) throw error
      
      setProfile({ ...profile, ...formData })
      setIsEditing(false)
      toast.success('Profile updated successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile')
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-surface items-center justify-center text-outline/50">
        <span className="material-symbols-outlined animate-spin mb-4 text-3xl">progress_activity</span>
        <span className="text-[10px] uppercase font-black tracking-widest">Loading profile...</span>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tight">My Profile</h2>
          <p className="text-[11px] font-bold text-outline uppercase tracking-[.2em] mt-2 opacity-70">Manage your account details</p>
        </div>
        
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border border-outline-variant/30 hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button 
              onClick={() => setIsEditing(true)}
              className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-surface-container-high border border-outline-variant/20 hover:border-primary/40 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">edit</span>
              Edit Profile
            </button>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left Column: Identity & Bio */}
        <div className="lg:col-span-2 space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary text-sm">person</span>
              <h3 className="text-[10px] font-black text-outline uppercase tracking-[.25em]">Personal Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">Full Name</label>
                <input 
                  disabled={!isEditing}
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all disabled:opacity-60"
                  placeholder="Enter your name"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">Email Address</label>
                <input 
                  disabled
                  value={profile?.email}
                  className="w-full bg-surface-container-low/40 border border-outline-variant/10 rounded-xl px-4 py-3 text-sm font-bold text-outline/50 cursor-not-allowed"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">About You</label>
              <textarea 
                disabled={!isEditing}
                rows={4}
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-4 text-sm font-medium leading-relaxed focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all disabled:opacity-60 resize-none"
                placeholder="Write something about yourself..."
              />
            </div>
          </section>

          <section className="space-y-6">
            <div className="flex items-center gap-2 px-1">
              <span className="material-symbols-outlined text-primary text-sm">business</span>
              <h3 className="text-[10px] font-black text-outline uppercase tracking-[.25em]">Library / Organization Details</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">Library or Organization Name</label>
                <input 
                  disabled={!isEditing}
                  value={formData.business_name}
                  onChange={(e) => setFormData({...formData, business_name: e.target.value})}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all disabled:opacity-60"
                  placeholder="e.g. ReadingSpace Hub"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">Contact Number</label>
                <input 
                  disabled={!isEditing}
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all disabled:opacity-60"
                  placeholder="+91-0000000000"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1">Address</label>
              <input 
                disabled={!isEditing}
                value={formData.address}
                onChange={(e) => setFormData({...formData, address: e.target.value})}
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-primary/10 focus:border-primary/40 transition-all disabled:opacity-60"
                placeholder="Enter your address"
              />
            </div>
          </section>
        </div>

        {/* Right Column: Actions & Security */}
        <div className="space-y-8">
          <section className="space-y-4">
            <h3 className="text-[10px] font-black text-outline uppercase tracking-[.25em] px-1 italic">Security</h3>
            <div className="card divide-y divide-outline-variant/5 overflow-hidden">
               <button className="w-full p-5 flex items-center justify-between hover:bg-surface-container-low transition-colors group">
                  <div className="flex items-center gap-4">
                     <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors text-xl">shield_person</span>
                     <div className="text-left">
                        <p className="text-[10px] font-black text-on-surface uppercase tracking-tight">Password & Security</p>
                        <p className="text-[9px] text-outline font-bold">Your account is secure</p>
                     </div>
                  </div>
                  <span className="material-symbols-outlined text-outline/20 text-sm">chevron_right</span>
               </button>
               
               <button 
                 onClick={handleLogout}
                 className="w-full p-5 flex items-center justify-between hover:bg-error/5 transition-colors group"
               >
                  <div className="flex items-center gap-4">
                     <span className="material-symbols-outlined text-error/40 group-hover:text-error transition-colors text-xl">logout</span>
                     <div className="text-left">
                        <p className="text-[10px] font-black text-error/80 uppercase tracking-tight">Log Out</p>
                        <p className="text-[9px] text-outline font-bold">This will log you out</p>
                     </div>
                  </div>
                  <span className="material-symbols-outlined text-error/20 text-sm">chevron_right</span>
               </button>
            </div>
          </section>

          <footer className="pt-8 px-2 space-y-4">
            <div className="flex items-center gap-3 opacity-30 group cursor-default">
               <div className="h-[1px] flex-1 bg-outline-variant/40" />
               <h4 className="text-[9px] font-black italic tracking-[.3em] uppercase">App Info</h4>
               <div className="h-[1px] flex-1 bg-outline-variant/40" />
            </div>
            <p className="text-center font-mono text-[7px] text-outline/30 uppercase leading-loose tracking-widest">
              RA-01 // Core 1.x.x <br/>
              Session ID: {Math.random().toString(36).substring(7).toUpperCase()}
            </p>
          </footer>
        </div>
      </main>
    </div>
  )
}

