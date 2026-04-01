'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Avatar from '@/components/ui/Avatar'

import { useEffect, useState } from 'react'

export default function StudentProfile() {
  const router = useRouter()
  const supabase = createClient()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    gender: ''
  })

  useEffect(() => {
    async function fetchProfile() {
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        if (authError || !authUser) {
          router.push('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        // Get active subscription for activeRoom name
        const { data: subData } = await supabase
          .from('subscriptions')
          .select('room:rooms(name)')
          .eq('student_id', authUser.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        // Count attendance logs
        const { count } = await supabase
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', authUser.id)

        const userProfile = {
          name: profileData?.name || authUser.email?.split('@')[0] || 'Unknown User',
          email: profileData?.email || authUser.email,
          phone: profileData?.phone || '',
          bio: profileData?.bio || '',
          gender: profileData?.gender || '',
          activeRoom: (subData?.room as any)?.name || 'No Active Room',
          daysAttended: count || 0
        }

        setProfile(userProfile)
        setFormData({
          name: userProfile.name,
          phone: userProfile.phone,
          bio: userProfile.bio,
          gender: userProfile.gender
        })
      } catch (err) {
        toast.error('Failed to load profile')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [router, supabase])

  const handleSave = async () => {
    setSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('profiles')
        .update({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
          gender: formData.gender,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (error) throw error
      
      setProfile((prev: any) => ({ ...prev, ...formData }))
      setIsEditing(false)
      toast.success('Profile updated')
    } catch (err: any) {
      toast.error(err.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-surface text-outline/30">
        <span className="material-symbols-outlined animate-spin mb-4 text-4xl">scanning</span>
        <span className="text-[10px] font-black uppercase tracking-[.4em]">Loading profile...</span>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-700 pb-32">
      {/* Dynamic Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-outline-variant/10 pb-8">
        <div>
          <h2 className="font-headline text-4xl font-black text-on-surface tracking-tight">My Profile</h2>
          <p className="text-[11px] font-bold text-outline uppercase tracking-[.2em] mt-2 opacity-70">Update your details</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest text-outline hover:bg-surface-container-low transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-primary text-white shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all overflow-hidden relative"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          ) : (
             <button 
                onClick={() => setIsEditing(true)}
                className="px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-all flex items-center gap-2 border border-outline-variant/10"
             >
                <span className="material-symbols-outlined text-sm">edit_note</span>
                Edit Profile
             </button>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Left Column: Visual Identity & Stats */}
        <div className="lg:col-span-4 space-y-8">
           <div className="card p-8 flex flex-col items-center text-center bg-surface-container-low/50 relative group">
              <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary mb-6 shadow-2xl shadow-primary/5 group-hover:scale-110 transition-transform duration-500">
                <Avatar name={profile.name} size={96} />
              </div>
              <h3 className="font-headline text-2xl font-black text-on-surface tracking-tight">{profile.name}</h3>
              <p className="text-[10px] font-black text-outline uppercase tracking-[.2em] mt-2 opacity-50 italic">{profile.email}</p>
              
              <div className="grid grid-cols-2 gap-4 w-full mt-10 pt-8 border-t border-outline-variant/10">
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-outline uppercase tracking-widest opacity-40">Sessions</p>
                    <p className="text-xl font-black italic text-primary">{profile.daysAttended}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[8px] font-black text-outline uppercase tracking-widest opacity-40">Frequency</p>
                    <p className="text-xl font-black italic text-secondary">High</p>
                 </div>
              </div>
           </div>

           <div className="p-6 bg-error/5 rounded-3xl border border-error/10 space-y-4">
              <div className="flex items-center gap-3 text-error">
                 <span className="material-symbols-outlined">security</span>
                 <p className="text-[10px] font-black uppercase tracking-widest">Sign Out</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-3 bg-white border border-error/20 text-error rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-error/10 transition-all active:scale-95"
              >
                 Log Out
              </button>
           </div>
        </div>

        {/* Right Column: Editable Components */}
        <div className="lg:col-span-8 space-y-12">
           <section className="space-y-8">
              <div className="flex items-center gap-3 px-1">
                 <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>badge</span>
                 <h4 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Personal Details</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Full Name</label>
                    {isEditing ? (
                      <input 
                         value={formData.name}
                         onChange={e => setFormData({...formData, name: e.target.value})}
                         className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-outline/30"
                         placeholder="Enter full name"
                      />
                    ) : (
                      <p className="px-4 py-3 bg-surface-container-lowest/50 border border-outline-variant/5 rounded-xl text-sm font-bold text-on-surface italic">{profile.name}</p>
                    )}
                 </div>

                 <div className="space-y-2">
                    <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">Mobile Number</label>
                    {isEditing ? (
                      <input 
                         value={formData.phone}
                         onChange={e => setFormData({...formData, phone: e.target.value})}
                         className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-outline/30"
                         placeholder="+91 00000 00000"
                      />
                    ) : (
                      <p className={`px-4 py-3 bg-surface-container-lowest/50 border border-outline-variant/5 rounded-xl text-sm font-bold text-on-surface ${!profile.phone && 'italic opacity-30 text-xs'}`}>
                        {profile.phone || 'No number added'}
                      </p>
                    )}
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-[9px] font-black text-outline/50 uppercase tracking-widest ml-1 italic">About Me</label>
                 {isEditing ? (
                    <textarea 
                       value={formData.bio}
                       onChange={e => setFormData({...formData, bio: e.target.value})}
                       className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl px-4 py-3 text-sm font-medium focus:ring-4 focus:ring-primary/5 focus:border-primary/40 transition-all placeholder:text-outline/30 min-h-[120px] resize-none"
                       placeholder="Briefly describe your academic goals or professional journey..."
                    />
                 ) : (
                    <p className={`px-4 py-4 bg-surface-container-lowest/50 border border-outline-variant/5 rounded-xl text-sm leading-relaxed text-on-surface ${!profile.bio && 'italic opacity-30 text-xs'}`}>
                      {profile.bio || 'Tell us something about yourself.'}
                    </p>
                 )}
              </div>
           </section>

           <section className="space-y-8 pt-8">
              <div className="flex items-center gap-3 px-1">
                 <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>deployed_code</span>
                 <h4 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Room Details</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="card p-6 bg-surface-container-low/30 border border-outline-variant/5 group">
                    <p className="text-[9px] font-black text-outline uppercase tracking-widest opacity-40 mb-3">Your Room</p>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">meeting_room</span>
                       </div>
                       <p className="text-sm font-black text-on-surface tracking-tight">{profile.activeRoom}</p>
                    </div>
                 </div>

                 <div className="card p-6 bg-surface-container-low/30 border border-outline-variant/5 group">
                    <p className="text-[9px] font-black text-outline uppercase tracking-widest opacity-40 mb-3">Account Type</p>
                    <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all">
                          <span className="material-symbols-outlined text-sm">assignment_ind</span>
                       </div>
                       <p className="text-sm font-black text-on-surface tracking-tight lowercase">student</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </main>
    </div>
  )
}
