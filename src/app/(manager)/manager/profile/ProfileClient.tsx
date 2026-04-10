'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { LogOut, Trash2 } from 'lucide-react'

export function ProfileActions() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  return (
    <button 
      onClick={handleLogout}
      className="px-4 py-1.5 rounded-full bg-error/10 text-error text-[10px] font-bold border border-error/5 hover:bg-error/20 transition-all active:scale-95"
    >
      Logout
    </button>
  )
}

export function ClearCacheButton() {
  const handleClearCache = () => {
    localStorage.clear()
    sessionStorage.clear()
    toast.success('Cache cleared successfully')
    setTimeout(() => window.location.reload(), 1000)
  }

  return (
    <button 
      onClick={handleClearCache}
      className="w-full py-3.5 rounded-2xl border border-error/10 text-error text-[11px] font-bold hover:bg-error/[0.03] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
    >
      <Trash2 size={14} className="opacity-60" />
      Clear Local Cache
    </button>
  )
}
