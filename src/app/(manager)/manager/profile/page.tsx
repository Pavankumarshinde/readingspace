import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Avatar from '@/components/ui/Avatar'
import { ProfileActions, ClearCacheButton } from './ProfileClient'

export default async function SpaceProfile() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return (
    <div className="max-w-[480px] md:max-w-2xl lg:max-w-3xl mx-auto px-6 pb-6 animate-in fade-in duration-700">
      {/* Simple Header - Ultra Compact */}
      <header className="flex flex-col gap-0.5 py-3 md:py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg md:text-xl font-headline font-black text-on-surface tracking-tight leading-none uppercase">Profile</h1>
          <ProfileActions />
        </div>
        <p className="text-[9px] md:text-[10px] font-bold text-indigo-600 opacity-90 uppercase tracking-wider">Account Control</p>
      </header>

      <main className="space-y-3 md:space-y-4">
        {/* Identity Card - Ultra Slim */}
        <section className="card p-4 md:p-5 flex flex-col items-center text-center">
          <div className="mb-2 md:mb-3 relative group">
             <Avatar name={profile.business_name || profile.name} size={48} fontSize={14} />
          </div>
          <div className="space-y-0.5">
            <h2 className="text-sm md:text-base font-black text-on-surface tracking-tight font-headline uppercase leading-tight">
              {profile.business_name || profile.name}
            </h2>
            <p className="text-[8px] md:text-[9px] font-bold text-on-surface-variant opacity-50 uppercase">
              {profile.address || 'No Location Set'}
            </p>
          </div>
        </section>

        {/* Account Information Card - Ultra Slim */}
        <section className="card p-4 md:p-5 space-y-3 md:space-y-4">
          <h3 className="text-[7px] md:text-[8px] font-black text-on-surface/30 uppercase tracking-[0.3em]">Identity</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
            <div className="space-y-0.5">
              <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Email</p>
              <p className="text-[11px] font-black text-on-surface">{profile.email}</p>
            </div>
            
            <div className="space-y-0.5">
              <p className="text-[7px] font-bold text-on-surface-variant uppercase tracking-widest opacity-40">Mobile</p>
              <p className="text-[11px] font-black text-on-surface">{profile.phone || 'N/A'}</p>
            </div>
          </div>
        </section>

        {/* App Settings Card - Ultra Slim */}
        <section className="card p-4 flex flex-col items-center justify-between gap-3 border-dashed border-slate-200">
           <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Diagnostics</p>
           <ClearCacheButton />
        </section>
      </main>
    </div>
  )
}

