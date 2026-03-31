import BottomNav from '@/components/ui/BottomNav'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="relative min-h-dvh bg-[var(--bg)]">
      <div className="max-w-[480px] mx-auto min-h-dvh pb-[var(--nav-height)]">
        {children}
      </div>
      <BottomNav role="manager" />
    </div>
  )
}
