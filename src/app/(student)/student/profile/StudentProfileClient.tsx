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
      className="px-6 py-2 rounded-full bg-error/5 text-error text-[10px] font-black uppercase tracking-[0.1em] hover:bg-error/10 transition-all active:scale-95"
    >
      Sign Out
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
      className="w-full py-4 rounded-[16px] bg-surface-container-low text-error text-[11px] font-bold hover:bg-error/5 transition-all active:scale-[0.98] flex items-center justify-center gap-2 uppercase tracking-[0.1em]"
    >
       <span>TERMINATE LOCAL ARCHIVE CACHE</span>
    </button>
  )
}
