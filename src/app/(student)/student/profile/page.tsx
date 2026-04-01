'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import Avatar from '@/components/ui/Avatar'
import { useEffect, useState } from 'react'
import { 
  User, 
  Mail, 
  Phone, 
  LogOut, 
  Edit3, 
  Save, 
  X, 
  ShieldCheck, 
  DoorOpen, 
  Award, 
  Activity,
  UserCircle 
} from 'lucide-react'

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

        const { data: subData } = await supabase
          .from('subscriptions')
          .select('room:rooms(name)')
          .eq('student_id', authUser.id)
          .eq('status', 'active')
          .limit(1)
          .maybeSingle()

        const { count } = await supabase
          .from('attendance_logs')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', authUser.id)

        const userProfile = {
          name: profileData?.name || authUser.email?.split('@')[0] || 'Member',
          email: profileData?.email || authUser.email,
          phone: profileData?.phone || '',
          bio: profileData?.bio || '',
          gender: profileData?.gender || '',
          activeRoom: (subData?.room as any)?.name || 'N/A',
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
        toast.error('Failed to retrieve profile')
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
      toast.success('Identity updated')
    } catch (err: any) {
      toast.error('Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin mb-4"></div>
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Synchronizing profile...</span>
      </div>
    )
  }

  if (!profile) return null

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32 px-8">
      {/* Precision Header */}
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5 opacity-80">Member Center</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Your Profile</h2>
           <p className="text-sm font-medium text-slate-500 mt-2">Manage your personal identity and learning preferences.</p>
        </div>
        <div className="flex gap-3">
          {isEditing ? (
            <>
              <button 
                onClick={() => setIsEditing(false)}
                className="px-6 py-3 rounded-2xl text-xs font-bold text-slate-500 hover:bg-white hover:shadow-sm transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="btn-primary"
              >
                <Save size={18} />
                <span>{saving ? 'Syncing...' : 'Save Profile'}</span>
              </button>
            </>
          ) : (
              <button 
                 onClick={() => setIsEditing(true)}
                 className="btn-primary bg-white !text-primary border border-primary/10 shadow-sm hover:shadow-md"
              >
                <Edit3 size={18} />
                <span>Modify Details</span>
             </button>
          )}
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Profile Sidebar */}
        <div className="lg:col-span-4 space-y-8">
            <div className="card p-10 flex flex-col items-center text-center bg-white border border-slate-100 relative group overflow-hidden">
               {/* Visual Detail */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-[60px] -mr-16 -mt-16" />
               
               <div className="w-28 h-28 rounded-[2rem] bg-slate-50 border-4 border-white flex items-center justify-center text-primary mb-6 shadow-2xl shadow-slate-200 group-hover:scale-105 transition-transform duration-500">
                 <Avatar name={profile.name} size={112} />
               </div>
               <h3 className="font-headline text-2xl font-extrabold text-on-surface tracking-tight">{profile.name}</h3>
               <p className="text-xs font-bold text-slate-400 mt-2">{profile.email}</p>
               
               <div className="grid grid-cols-2 gap-4 w-full mt-10 pt-10 border-t border-slate-50">
                  <div className="space-y-1">
                     <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Attendance</p>
                     <p className="text-2xl font-extrabold text-primary">{profile.daysAttended}</p>
                  </div>
                  <div className="space-y-1 border-l border-slate-50">
                     <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Status</p>
                     <p className="text-2xl font-extrabold text-secondary">Pro</p>
                  </div>
               </div>
            </div>

            <div className="card p-8 bg-rose-50/30 border border-rose-100 flex flex-col gap-6">
              <div className="flex items-center gap-3 text-rose-500">
                 <ShieldCheck size={20} />
                 <p className="text-xs font-extrabold uppercase tracking-widest">Security Zone</p>
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-white border border-rose-200 text-rose-600 rounded-2xl text-xs font-extrabold shadow-sm hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                 <LogOut size={16} />
                 Sign Out from Portal
              </button>
            </div>
        </div>

        {/* Form Content */}
        <div className="lg:col-span-8 space-y-10">
           {/* Section: Basic Profile */}
           <section className="space-y-6">
              <div className="flex items-center gap-3 px-1">
                 <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                    <UserCircle size={22} />
                 </div>
                 <h4 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Identity Information</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="space-y-2.5">
                    <label className="text-xs font-bold text-on-surface-variant ml-1">Visible Name</label>
                    {isEditing ? (
                       <input 
                          value={formData.name}
                          onChange={e => setFormData({...formData, name: e.target.value})}
                          className="input"
                          placeholder="Your full name"
                       />
                    ) : (
                       <div className="px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-on-surface shadow-sm">
                          {profile.name}
                       </div>
                    )}
                 </div>

                 <div className="space-y-2.5">
                    <label className="text-xs font-bold text-on-surface-variant ml-1">Contact Phone</label>
                    {isEditing ? (
                       <input 
                          value={formData.phone}
                          onChange={e => setFormData({...formData, phone: e.target.value})}
                          className="input"
                          placeholder="+91 XXXXX XXXXX"
                       />
                    ) : (
                       <div className={`px-6 py-4 bg-white border border-slate-100 rounded-2xl text-sm font-bold text-on-surface shadow-sm ${!profile.phone && 'text-slate-300'}`}>
                         {profile.phone || 'Connect a mobile number'}
                       </div>
                    )}
                 </div>
              </div>

              <div className="space-y-2.5">
                 <label className="text-xs font-bold text-on-surface-variant ml-1">Biographical Background</label>
                 {isEditing ? (
                     <textarea 
                        value={formData.bio}
                        onChange={e => setFormData({...formData, bio: e.target.value})}
                        className="input min-h-[140px] py-6 resize-none"
                        placeholder="Tell us about your learning goals..."
                     />
                 ) : (
                     <div className={`px-8 py-6 bg-white border border-slate-100 rounded-[2rem] text-sm leading-relaxed text-on-surface-variant shadow-sm ${!profile.bio && 'text-slate-300 italic'}`}>
                       {profile.bio || 'Add a brief bio to personalize your workspace.'}
                     </div>
                 )}
              </div>
           </section>

           {/* Section: Academic Context */}
           <section className="space-y-6">
              <div className="flex items-center gap-3 px-1">
                 <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/5">
                    <Award size={22} />
                 </div>
                 <h4 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Active Context</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className="card p-8 bg-white border border-slate-100 group">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Enrolled Room</p>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shadow-sm">
                          <DoorOpen size={20} />
                       </div>
                       <p className="text-base font-extrabold text-on-surface">{profile.activeRoom}</p>
                    </div>
                 </div>

                 <div className="card p-8 bg-white border border-slate-100 group">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-3">Role Authority</p>
                    <div className="flex items-center gap-4">
                       <div className="w-12 h-12 rounded-2xl bg-secondary/5 flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-white transition-all shadow-sm">
                          <Activity size={20} />
                       </div>
                       <p className="text-base font-extrabold text-on-surface uppercase tracking-widest">Student</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>
      </main>
    </div>
  )
}
