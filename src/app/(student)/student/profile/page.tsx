import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { ProfileActions, ClearCacheButton } from './StudentProfileClient'

export default async function StudentProfile() {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    redirect('/login')
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

  const profile = {
    name: profileData?.name || authUser.email?.split('@')[0] || 'Member',
    email: profileData?.email || authUser.email,
    phone: profileData?.phone || '',
    activeRoom: (subData?.room as any)?.name || 'Not Enrolled'
  }

  if (!profileData) return null

  return (
    <div className="max-w-[480px] md:max-w-2xl lg:max-w-3xl mx-auto px-8 pb-32 animate-in fade-in duration-1000 pt-12">
      {/* Editorial Header */}
      <header className="flex flex-col gap-2 pb-10 border-b border-surface-container-low mb-12">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
             <span className="section-sub text-[10px]">Reader Identity</span>
             <h1 className="section-header text-3xl">Private Profile</h1>
           </div>
           <ProfileActions />
        </div>
      </header>
 
      <main className="space-y-8">
        {/* Identity Portrait */}
        <section className="card p-12 flex flex-col items-center text-center shadow-ambient">
          <div className="mb-6 relative">
             <Avatar name={profile.name} size={100} fontSize={32} />
             <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full border-4 border-surface flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
             </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-on-surface font-display italic tracking-tight">
              {profile.name}
            </h2>
            <p className="text-[10px] font-bold text-secondary uppercase tracking-[0.2em]">
              CURRENT ARCHIVE: {profile.activeRoom}
            </p>
          </div>
        </section>
 
        {/* Account dossier */}
        <section className="card p-10 space-y-10 shadow-ambient">
          <h3 className="text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-[0.3em]">Credentials & Records</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em]">Digital Identifier</p>
              <p className="text-base font-bold text-on-surface tracking-tight">{profile.email}</p>
            </div>
            
            <div className="space-y-2">
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-[0.15em]">Comm Channel</p>
              <p className="text-base font-bold text-primary tracking-tight">{profile.phone || 'NOT REGISTERED'}</p>
            </div>
          </div>
        </section>
 
        {/* Archive Integrity */}
        <section className="card p-8 flex flex-col items-center justify-between gap-6 bg-surface-container-low">
           <div className="text-center space-y-2">
              <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-[0.2em]">System Integrity</p>
              <p className="text-[11px] font-medium text-on-surface-variant/60 max-w-[280px]">Should you experience inconsistencies in your archive records, a local cache reset is recommended.</p>
           </div>
           <ClearCacheButton />
        </section>
      </main>
    </div>
  )
}
