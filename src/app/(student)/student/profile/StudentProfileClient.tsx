'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'

// ── Log Out ───────────────────────────────────────────────────────────────────
export function ProfileActions() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)

  const handleLogout = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login')
    toast.success('Signed out')
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className="w-full py-2.5 bg-[#D4611A] text-white text-[10px] font-bold tracking-widest uppercase rounded-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-60"
    >
      {loading ? 'Signing out...' : 'Log Out'}
    </button>
  )
}

// ── Clear Cache ───────────────────────────────────────────────────────────────
export function ClearCacheButton() {
  const handleClearCache = () => {
    localStorage.clear()
    sessionStorage.clear()
    toast.success('Local archive cleared')
    setTimeout(() => window.location.reload(), 800)
  }

  return (
    <button
      onClick={handleClearCache}
      className="text-error/60 text-[9px] font-bold tracking-widest uppercase hover:text-error transition-colors"
    >
      Terminate Local Archive
    </button>
  )
}

// ── Send Query Modal ──────────────────────────────────────────────────────────
export function SendQueryButton() {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  const handleSend = async () => {
    if (!message.trim()) {
      toast.error('Please write your query first')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/student/send-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      })

      if (res.ok) {
        toast.success('Query sent successfully')
        setMessage('')
        setOpen(false)
      } else {
        // Graceful fallback — open mailto
        window.location.href = `mailto:support@readingspace.in?subject=Student Query&body=${encodeURIComponent(message)}`
        setOpen(false)
      }
    } catch {
      window.location.href = `mailto:support@readingspace.in?subject=Student Query&body=${encodeURIComponent(message)}`
      setOpen(false)
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-2 px-4 bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant text-[10px] font-bold tracking-widest uppercase rounded-lg hover:bg-surface-container-low transition-colors"
      >
        Send Query
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Sheet */}
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-5 shadow-xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="font-headline italic text-xl font-bold text-on-surface leading-tight">
                  Send a Query
                </h3>
                <p className="text-[9px] text-secondary/60 uppercase tracking-widest font-bold mt-0.5">
                  We'll get back to you shortly
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-outline/60 hover:text-on-surface transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: '20px' }}
                >
                  close
                </span>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your query..."
              rows={5}
              className="w-full bg-surface-container-low border-none rounded-lg p-3 text-sm text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/40 outline-none resize-none font-body"
            />

            <div className="flex gap-2 mt-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 py-2.5 bg-surface-container-low text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !message.trim()}
                className="flex-1 py-2.5 bg-primary text-white text-[10px] font-bold uppercase tracking-widest rounded-lg hover:opacity-90 transition-opacity active:scale-95 disabled:opacity-50"
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
