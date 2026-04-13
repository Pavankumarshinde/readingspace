import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProfileActions, ClearCacheButton, SendManagerQueryButton, HowToUseManagerButton, EditManagerProfileFlow } from './ProfileClient'

export default async function ManagerProfile() {
  const supabase = await createClient()

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()
  if (!authUser) {
    redirect('/login')
  }

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', authUser.id)
    .single()

  const profile = {
    name: profileData?.name || authUser.email?.split('@')[0] || 'Manager',
    business_name: profileData?.business_name || '',
    address: profileData?.address || '',
    email: profileData?.email || authUser.email || '',
    phone: profileData?.phone || '',
  }

  // Derive initials using business name ideally, or personal name
  const parts = profile.business_name ? profile.business_name.trim().split(' ') : profile.name.trim().split(' ')
  const initials = parts
    .map((p: string) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  if (!profileData) return null

  return (
    <>
      <main className="pt-8 pb-28 md:pt-16 md:pb-12 px-4 max-w-md md:max-w-4xl mx-auto flex flex-col md:flex-row md:items-stretch gap-8 md:gap-12 animate-in fade-in duration-700">
        
        {/* ── Desktop Left Column: Avatar + Name ─────────────────────── */}
        <div className="md:w-1/3 flex flex-col items-center md:bg-surface-container-low rounded-2xl md:p-8 md:border md:border-outline-variant/10">
          <section className="flex flex-col items-center mt-6 md:mt-2 mb-6 md:mb-2 w-full">
            <div className="w-20 h-20 md:w-32 md:h-32 bg-primary/90 rounded-2xl md:rounded-3xl flex items-center justify-center mb-4 md:mb-6 shadow-sm relative">
              <span className="font-headline text-2xl md:text-5xl italic text-white tracking-widest">
                {initials}
              </span>
              <EditManagerProfileFlow profileData={profile} />
            </div>

            <div className="text-center w-full">
              <h3 className="text-2xl md:text-3xl font-headline font-bold text-on-surface truncate px-2">
                {profile.business_name || profile.name}
              </h3>
              <p className="text-[10px] md:text-[11px] font-medium tracking-widest text-secondary uppercase opacity-80 mt-1 md:mt-2">
                {profile.address || 'Facility Address Unset'}
              </p>
            </div>
          </section>
        </div>

        {/* ── Desktop Right Column: Info & Actions ───────────────────── */}
        <div className="flex-1 space-y-4 flex flex-col justify-center">
          <div className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl border border-outline-variant/10 space-y-4 shadow-sm relative overflow-hidden">
            
            <div className="relative z-10">
              <p className="text-[9px] md:text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-1">
                Admin Identifier
              </p>
              <p className="text-sm md:text-base text-on-surface font-medium truncate">
                {profile.email}
              </p>
            </div>

            <div className="border-t border-outline-variant/10 pt-4 relative z-10">
              <p className="text-[9px] md:text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-1">
                Manager Name
              </p>
              <p className="text-sm md:text-base text-on-surface font-medium">
                {profile.name}
              </p>
            </div>

            {profile.phone && (
              <div className="border-t border-outline-variant/10 pt-4 relative z-10">
                <p className="text-[9px] md:text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-1">
                  Contact String
                </p>
                <p className="text-sm md:text-base text-on-surface font-medium">
                  {profile.phone}
                </p>
              </div>
            )}
          </div>

          {/* ── Action Buttons ─────────────────────────────────────────── */}
          <div className="pt-2 flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <HowToUseManagerButton />
              <SendManagerQueryButton />
            </div>
            <ProfileActions />
          </div>

          {/* ── System Integrity ──────────────────────────────────────── */}
          <div className="mt-8 pt-6 text-center border-t border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant/50 leading-relaxed max-w-[260px] mx-auto mb-4 font-body">
              Archive records are synchronized with the central repository. App configurations apply directly.
            </p>
            <ClearCacheButton />
          </div>
        </div>
      </main>
    </>
  )
}
