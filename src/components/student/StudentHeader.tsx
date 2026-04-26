'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

// ── Brand Header ─────────────────────────────────────────────────────────────
// Used on: Rooms list, Notes list, Profile
export function StudentBrandHeader() {
  const [initials, setInitials] = useState('RS')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user
      if (!user) return
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split('@')[0] ||
        'User'
      const parts = name.trim().split(' ')
      setInitials(
        parts
          .map((p: string) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase()
      )
    })
  }, [])

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 border-b border-outline-variant/10 md:hidden">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <BookOpen size={16} strokeWidth={2.5} />
        </div>
        <h1 className="font-headline italic text-lg font-semibold text-primary tracking-tight leading-none">
          ReadingSpace
        </h1>
      </div>
      <Link href="/student/profile" className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-outline-variant/30 shrink-0 hover:bg-primary/20 transition-colors">
        <span className="text-[10px] font-bold text-primary">{initials}</span>
      </Link>
    </header>
  )
}

// ── Room Header ───────────────────────────────────────────────────────────────
// Used on: Room detail page — shows back arrow + room name instead of brand
export function StudentRoomHeader({
  roomName,
  subtitle,
  expiresIn,
}: {
  roomName: string
  subtitle?: string
  expiresIn?: number
}) {
  const router = useRouter()

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface/80 backdrop-blur-xl flex items-center justify-between px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 border-b border-outline-variant/10 shadow-sm md:hidden">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center justify-center hover:opacity-70 transition-opacity"
        >
          <span
            className="material-symbols-outlined text-primary"
            style={{ fontSize: '20px' }}
          >
            arrow_back
          </span>
        </button>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="font-headline italic text-base font-bold text-on-surface leading-tight">
              {roomName}
            </h1>
            {expiresIn !== undefined && expiresIn <= 7 && expiresIn >= 0 && (
              <span className="bg-error/10 border border-error/20 rounded-md px-1.5 py-0.5 text-[8px] font-black text-error uppercase tracking-widest flex items-center gap-0.5 whitespace-nowrap">
                <span className="material-symbols-outlined shrink-0" style={{ fontSize: '10px' }}>warning</span>
                {expiresIn === 0 ? 'Expires Today' : `Expires in ${expiresIn}d`}
              </span>
            )}
          </div>
          {subtitle && (
            <span className="text-[8px] uppercase tracking-widest text-secondary font-semibold opacity-80">
              {subtitle}
            </span>
          )}
        </div>
      </div>
    </header>
  )
}
