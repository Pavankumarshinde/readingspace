'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

// ── Brand Header ─────────────────────────────────────────────────────────────
// Used on: Rooms list, Notes list, Profile
export function StudentBrandHeader() {
  const [initials, setInitials] = useState('RS')

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data: { user } }) => {
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
        <span
          className="material-symbols-outlined text-primary"
          style={{ fontSize: '20px' }}
        >
          menu
        </span>
        <h1 className="font-headline italic text-lg font-semibold text-primary tracking-tight leading-none">
          ReadingSpace
        </h1>
      </div>
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-outline-variant/30 shrink-0">
        <span className="text-[10px] font-bold text-primary">{initials}</span>
      </div>
    </header>
  )
}

// ── Room Header ───────────────────────────────────────────────────────────────
// Used on: Room detail page — shows back arrow + room name instead of brand
export function StudentRoomHeader({
  roomName,
  subtitle,
}: {
  roomName: string
  subtitle?: string
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
          <h1 className="font-headline italic text-base font-bold text-on-surface leading-tight">
            {roomName}
          </h1>
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
