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
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full fixed top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">My Profile</h1>
        </div>
        <div className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden border-2 border-primary-fixed shrink-0">
          <Avatar name={user.name} size={40} />
        </div>
      </header>

      <main className="pt-24 px-6 max-w-2xl mx-auto mt-4 pb-32">
        {/* Profile Hero Section */}
        <section className="mb-10">
          <div className="bg-surface-container-lowest p-8 rounded-3xl border border-outline-variant/30 relative overflow-hidden shadow-sm">
            <button className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container-low transition-colors text-outline">
              <span className="material-symbols-outlined text-[20px]">edit</span>
            </button>
            <div className="flex flex-col gap-1 relative z-10">
              <h2 className="font-headline text-3xl font-bold text-primary tracking-tight italic">
                {user.name}
              </h2>
              <p className="text-on-surface-variant font-body text-sm font-medium opacity-80 uppercase tracking-widest leading-loose">
                {user.email}
              </p>
            </div>
            {/* Decoration */}
            <div className="absolute -bottom-6 -right-6 opacity-[0.03] pointer-events-none">
              <span className="material-symbols-outlined text-[140px]">school</span>
            </div>
          </div>
        </section>

        {/* Settings List */}
        <section className="space-y-8">
          <div>
            <h3 className="font-headline text-lg font-bold text-primary mb-4 px-2">Account Preferences</h3>
            <div className="bg-surface-container-low rounded-3xl overflow-hidden shadow-inner-soft">
              {[
                { title: 'Notifications', sub: 'Manage alerts and reminders', icon: 'notifications' },
                { title: 'Security', sub: 'Password and biometric access', icon: 'security' },
                { title: 'Appearance', sub: 'Themes and font scaling', icon: 'palette' }
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-5 hover:bg-surface-container transition-colors cursor-pointer group border-b border-outline-variant/5 last:border-none">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-primary shadow-sm">
                      <span className="material-symbols-outlined">{item.icon}</span>
                    </div>
                    <div>
                      <p className="font-body font-bold text-on-surface text-[15px]">{item.title}</p>
                      <p className="text-xs text-on-surface-variant font-medium">{item.sub}</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-all duration-300 group-hover:translate-x-1">
                    chevron_right
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-headline text-lg font-bold text-primary mb-4 px-2">Library Status</h3>
            <div className="bg-surface-container-low rounded-3xl p-6 border border-outline-variant/10 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-secondary fill-icon">history</span>
                  <span className="font-body font-bold text-sm text-on-surface">Currently Active Room</span>
                </div>
                <span className="text-[11px] font-bold text-outline uppercase tracking-wider bg-surface-container-lowest px-3 py-1 rounded-full shadow-sm">
                  {user.activeRoom}
                </span>
              </div>
              
              <div className="flex flex-col gap-3">
                <div className="progress-bar h-2.5">
                  <div className="progress-fill" style={{ width: '66%' }} />
                </div>
                <p className="text-[10px] text-on-surface-variant uppercase tracking-[0.15em] font-bold text-center">
                  Days Attended This Month: <span className="text-secondary">{user.daysAttended}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="pt-4 pb-12">
            <button 
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-3 py-4 px-6 bg-error-container text-on-error-container rounded-2xl font-headline font-bold hover:opacity-90 transition-all active:scale-[0.98] shadow-lg shadow-error/5"
            >
              <span className="material-symbols-outlined">logout</span>
              <span>Logout from Session</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  )
}
