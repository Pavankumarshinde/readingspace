import Sidebar from '@/components/ui/Sidebar'
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
    <div className="flex min-h-screen bg-surface">
      {/* Responsive Sidebar for Tablet/Laptop */}
      <Sidebar role="manager" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <main className="flex-1 overflow-y-auto pb-24 md:pb-8">
           <div className="responsive-container py-1 md:py-1.5">
              {children}
           </div>
        </main>
        
        {/* Bottom Nav for Mobile */}
        <BottomNav role="manager" />
      </div>
    </div>
  )
}
