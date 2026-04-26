import Sidebar from '@/components/ui/Sidebar'
import BottomNav from '@/components/ui/BottomNav'
import { ManagerBrandHeader } from '@/components/manager/ManagerHeader'
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
    <div className="flex h-dvh overflow-hidden bg-surface">
      {/* Responsive Sidebar for Tablet/Laptop */}
      <Sidebar role="manager" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile-only brand header */}
        <ManagerBrandHeader />

        <main className="flex-1 overflow-hidden">
          {children}
        </main>
        
        {/* Bottom Nav for Mobile */}
        <BottomNav role="manager" />
      </div>
    </div>
  )
}
