import BottomNav from '@/components/ui/BottomNav'
import Sidebar from '@/components/ui/Sidebar'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen bg-surface">
      {/* Responsive Sidebar — Tablet/Laptop (md+) */}
      <Sidebar role="student" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-hidden">
        {/*
          No layout-level mobile header here.
          Each student page provides its own <StudentBrandHeader> or
          <StudentRoomHeader> to ensure per-page control of the top bar.
        */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Floating Pill Bottom Nav — Mobile only */}
        <BottomNav role="student" />
      </div>
    </div>
  )
}
