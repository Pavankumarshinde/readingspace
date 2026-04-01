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

        setProfile({
          name: profileData?.name || authUser.email?.split('@')[0] || 'Unknown User',
          email: profileData?.email || authUser.email,
          activeRoom: (subData?.room as any)?.name || 'No Active Room',
          daysAttended: count || 0
        })
      } catch (err) {
        toast.error('Failed to load profile details')
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    
    fetchProfile()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Logged out successfully')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface">
        <div className="w-8 h-8 rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
      </div>
    )
  }

  const user = profile || {
    name: 'Unknown',
    email: '',
    activeRoom: '-',
    daysAttended: 0
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header Section */}
      <section>
        <h2 className="section-header">Account Space</h2>
        <p className="section-sub mt-1">Scholar identity & preferences</p>
      </section>

      <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
           {/* Profile Hero section */}
           <section>
             <div className="card p-6 relative overflow-hidden group hover:border-primary/20 transition-all">
               <button className="absolute top-4 right-4 btn-ghost scale-75 group-hover:text-primary transition-colors">
                 <span className="material-symbols-outlined">edit</span>
               </button>
               <div className="flex items-center gap-6">
                 <div className="w-14 h-14 rounded-full bg-surface-container-highest overflow-hidden border border-outline-variant/30 shrink-0">
                   <Avatar name={user.name} size={56} />
                 </div>
                 <div className="flex flex-col">
                   <h2 className="font-headline text-lg font-bold text-on-surface tracking-tight leading-tight group-hover:text-primary transition-colors">
                     {user.name}
                   </h2>
                   <p className="font-mono text-[9px] text-outline uppercase tracking-widest mt-1.5 font-bold">
                     {user.email}
                   </p>
                 </div>
               </div>

               {/* Stats Row */}
               <div className="grid grid-cols-2 gap-4 mt-8 pt-6 border-t border-outline-variant/10">
                  <div>
                    <p className="text-[8px] text-outline uppercase tracking-widest mb-1 font-bold">Current Hub</p>
                    <p className="font-headline text-xs font-bold text-on-surface truncate">{user.activeRoom}</p>
                  </div>
                  <div>
                    <p className="text-[8px] text-outline uppercase tracking-widest mb-1 font-bold">Attendance</p>
                    <p className="font-headline text-xs font-bold text-on-surface">{user.daysAttended} Sessions</p>
                  </div>
               </div>
             </div>
           </section>

           {/* Security / Dangerous Area */}
           <section className="space-y-4">
             <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Session Protocol</h3>
             <button 
               onClick={handleLogout}
               className="w-full flex items-center justify-center gap-2 py-3 border border-error/20 text-error bg-error/5 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-error/10 transition-all active:scale-[0.98]"
             >
               <span className="material-symbols-outlined icon-xs">logout</span>
               <span>Terminate Session</span>
             </button>
             <p className="text-center text-[8px] text-outline/40 font-mono uppercase tracking-widest">
               ReadingSpace Build 1.2.x // Scholar Node
             </p>
           </section>
        </div>

        <div className="space-y-8">
           {/* Preferences Grid */}
           <section className="space-y-4">
             <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Global Preferences</h3>
             <div className="card divide-y divide-outline-variant/10 overflow-hidden">
               {[
                 { title: 'Notifications', icon: 'notifications', desc: 'Alerts & status' },
                 { title: 'Security & Privacy', icon: 'security', desc: 'Encryption & access' },
                 { title: 'Theme Engine', icon: 'palette', desc: 'Visual identity' }
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <span className="material-symbols-outlined text-outline/40 text-[20px] group-hover:text-primary transition-colors">{item.icon}</span>
                     <div>
                       <p className="font-bold text-xs text-on-surface leading-tight">{item.title}</p>
                       <p className="text-[9px] text-outline/60 uppercase tracking-widest font-bold mt-0.5">{item.desc}</p>
                     </div>
                   </div>
                   <span className="material-symbols-outlined text-outline-variant/30 text-[18px] group-hover:translate-x-1 transition-transform group-hover:text-primary">
                     chevron_right
                   </span>
                 </div>
               ))}
             </div>
           </section>

           <section className="space-y-4">
             <h3 className="text-[9px] font-bold text-outline uppercase tracking-widest px-1">Archive & Support</h3>
             <div className="card divide-y divide-outline-variant/10 overflow-hidden">
               {[
                 { title: 'Information Center', icon: 'help_outline' },
                 { title: 'System Documentation', icon: 'info' }
               ].map((item, i) => (
                 <div key={i} className="flex items-center justify-between p-4 hover:bg-surface-container-low transition-colors cursor-pointer group">
                   <div className="flex items-center gap-4">
                     <span className="material-symbols-outlined text-outline/40 text-[20px] group-hover:text-primary transition-colors">{item.icon}</span>
                     <p className="font-bold text-xs text-on-surface">{item.title}</p>
                   </div>
                   <span className="material-symbols-outlined text-outline-variant/30 text-[18px] group-hover:translate-x-1 transition-transform group-hover:text-primary">
                     chevron_right
                   </span>
                 </div>
               ))}
             </div>
           </section>
        </div>
      </main>
    </div>
  )
}
