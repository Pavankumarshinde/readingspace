import BottomNav from '@/components/ui/BottomNav'
import Sidebar from '@/components/ui/Sidebar'
import Avatar from '@/components/ui/Avatar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Responsive Sidebar for Tablet/Laptop */}
      <Sidebar role="student" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Top Header - Mobile Only */}
        <header className="bg-surface/80 backdrop-blur-md flex justify-between items-center px-6 py-3 w-full sticky top-0 z-40 border-b border-outline-variant/10 md:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary scale-90" style={{ fontVariationSettings: "'FILL' 1" }}>
              menu_book
            </span>
            <h1 className="font-headline font-semibold text-base tracking-tight text-primary">ReadingSpace</h1>
          </div>
          <div className="flex items-center gap-3">
             {/* Icons removed as per request */}
          </div>
        </header>

        <main className="flex-1 overflow-y-auto pb-24 md:pb-4">
           <div className="responsive-container py-1 md:py-1.5">
              {children}
           </div>
        </main>
        
        {/* Bottom Nav for Mobile */}
        <BottomNav role="student" />
      </div>
    </div>
  )
}
