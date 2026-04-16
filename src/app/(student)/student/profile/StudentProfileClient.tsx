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

// ── How To Use Modal ────────────────────────────────────────────────────────
export function HowToUseButton() {
  const [open, setOpen] = useState(false)

  const steps = [
    { title: 'Setup Profile', desc: "Keep your digital identifier and contact string up to date." },
    { title: 'Joining Rooms', desc: "Navigate to 'Rooms' and use your manager's 6-digit access code." },
    { title: 'Pass & Attendance', desc: "Click a room to access your QR pass. Present this at the desk." },
    { title: 'Study Notes', desc: "Capture ideas in the 'Notes' tab—a distraction-free environment." },
    { title: 'Need Help?', desc: "Use the 'Send Query' button to contact your administrator." }
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-3 px-4 bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant text-[11px] font-bold tracking-widest uppercase rounded-xl hover:bg-surface-container-low transition-colors text-center shadow-sm flex items-center justify-center gap-2 w-full"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>menu_book</span>
        App Guide
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0 mx-auto border border-outline-variant/10 max-h-[85vh] overflow-y-auto custom-scrollbar">
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-headline italic text-2xl font-bold text-on-surface leading-tight">
                  How to use ReadingSpace
                </h3>
                <p className="text-[10px] text-secondary/60 uppercase tracking-widest font-bold mt-1">
                  quick start guide
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-outline/60 hover:text-on-surface transition-colors mt-1">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>
            
            <div className="space-y-5">
              {steps.map((step, index) => (
                <div key={index} className="flex gap-4 items-start">
                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-xs mt-0.5 font-headline italic">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="text-[14px] text-on-surface font-semibold mb-0.5">{step.title}</h4>
                    <p className="text-[13px] text-on-surface-variant/80 font-body leading-relaxed">
                      {step.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-8 w-full py-2.5 bg-surface-container-low text-on-surface-variant text-[10px] font-bold uppercase tracking-widest rounded-lg hover:bg-surface-container transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
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
        toast.error('Failed to send query.')
      }
    } catch {
      toast.error('Network Error.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="py-3 px-4 bg-surface-container-lowest border border-outline-variant/20 text-on-surface-variant text-[11px] font-bold tracking-widest uppercase rounded-xl hover:bg-surface-container-low transition-colors text-center shadow-sm w-full gap-2 flex items-center justify-center"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>chat_bubble</span>
        Send Query
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center animate-in fade-in duration-200">
          <div
            className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0 mx-auto border border-outline-variant/10">
            <div className="flex justify-between items-start mb-5">
              <div>
                <h3 className="font-headline italic text-2xl font-bold text-on-surface leading-tight">
                  Send a query
                </h3>
                <p className="text-[10px] text-secondary/60 uppercase tracking-widest font-bold mt-1">
                  we'll get back to you securely
                </p>
              </div>
              <button onClick={() => setOpen(false)} className="text-outline/60 hover:text-on-surface transition-colors mt-1">
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
              </button>
            </div>

            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your issue or request..."
              rows={5}
              className="w-full bg-surface-container-low border-none rounded-lg p-4 text-[13px] text-on-surface placeholder:text-outline/50 focus:ring-1 focus:ring-primary/40 outline-none resize-none font-body mb-4"
            />

            <div className="flex gap-2">
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
                {sending ? 'Sending...' : 'Send Query'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Edit Profile & OTP Flow ─────────────────────────────────────────────────────
export function EditProfileFlow({ profileData }: { profileData: any }) {
  const router = useRouter()
  const [step, setStep] = useState<'idle' | 'otp' | 'form'>('idle')
  const [loading, setLoading] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpProofToken, setOtpProofToken] = useState('')

  const [form, setForm] = useState({
    name: profileData.name || '',
    phone: profileData.phone || ''
  })

  const needsOtpForCurrentChanges = () => {
    const currentPhone = (profileData.phone || '').trim()
    const nextPhone = (form.phone || '').trim()
    return currentPhone !== nextPhone
  }

  const handleRequestOTP = async () => {
    if (!needsOtpForCurrentChanges()) {
      setStep('form')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/student/profile/request-otp', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send OTP')
      toast.success('Verification code sent to your email!')
      setStep('otp')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    if (otp.length < 6) return toast.error('Code must be 6 digits')
    setLoading(true)
    try {
      const res = await fetch('/api/student/profile/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otpCode: otp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid code')
      setOtpProofToken(data.proofToken || '')
      toast.success('Identity verified')
      setStep('form')
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired verification code')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!form.name.trim()) return toast.error('Name cannot be empty')

    const sensitiveChanged = needsOtpForCurrentChanges()
    if (sensitiveChanged && !otpProofToken) {
      toast.error('Please verify OTP before saving phone changes')
      setStep('otp')
      return
    }

    setLoading(true)
    try {
      const originalName = profileData.name || ''
      const originalPhone = profileData.phone || ''

      const payload: Record<string, string> = {}
      if (form.name.trim() !== originalName.trim()) payload.name = form.name.trim()
      if (form.phone.trim() !== originalPhone.trim()) payload.phone = form.phone.trim()

      if (Object.keys(payload).length === 0) {
        toast.error('No changes to save')
        setLoading(false)
        return
      }

      if (sensitiveChanged) {
        payload.otpProofToken = otpProofToken
      }

      const res = await fetch('/api/student/profile/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update')

      toast.success('Profile updated securely')
      setOtp('')
      setOtpProofToken('')
      setStep('idle')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'Error saving profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div 
        onClick={handleRequestOTP}
        className="absolute -bottom-1.5 -right-1.5 md:-bottom-2 md:-right-2 w-8 h-8 md:w-10 md:h-10 bg-surface-container-lowest rounded-full shadow-md border border-outline-variant/10 flex items-center justify-center text-primary cursor-pointer hover:bg-surface-container-low transition-colors"
      >
        {loading && step === 'idle' ? (
           <span className="material-symbols-outlined animate-spin" style={{ fontSize: '16px' }}>sync</span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>edit</span>
        )}
      </div>

      {/* OTP MODAL */}
      {step === 'otp' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" onClick={() => setStep('idle')} />
          <div className="relative w-full max-w-sm bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-6 shadow-xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0 mx-auto border border-outline-variant/10">
            <h3 className="font-headline italic text-2xl font-bold text-on-surface mb-2">Security Check</h3>
            <p className="text-[13px] text-on-surface/60 font-body leading-relaxed mb-6">
              To protect sensitive profile changes, we've sent a 6-digit verification code to your email.
            </p>
            <input
              type="text"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              className="w-full bg-surface-container-low border border-outline-variant/20 rounded-xl p-4 text-center text-2xl tracking-[0.5em] font-bold text-on-surface placeholder:text-outline/30 focus:ring-1 focus:ring-primary/40 outline-none mb-6"
            />
            <div className="flex gap-2">
              <button
                onClick={() => setStep('idle')}
                className="flex-1 py-3 bg-transparent text-on-surface-variant font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-surface-container-lowest transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleVerifyOTP}
                disabled={loading || otp.length !== 6}
                className="flex-1 py-3 bg-primary text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Verifying...' : 'Verify'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT FORM MODAL */}
      {step === 'form' && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center md:items-center animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-on-surface/30 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-surface-container-lowest rounded-t-2xl md:rounded-2xl p-6 md:p-8 shadow-xl animate-in slide-in-from-bottom duration-300 md:slide-in-from-bottom-0 mx-auto border border-outline-variant/10">
            <h3 className="font-headline italic text-2xl font-bold text-on-surface mb-6">Edit Profile</h3>
            
            <div className="space-y-4 mb-8">
              <div>
                <label className="text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-2 block">
                  Full Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface font-headline font-bold text-lg focus:border-primary focus:ring-0 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold tracking-widest text-secondary/60 uppercase mb-2 block">
                  Contact String (Phone)
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full bg-transparent border-b border-outline-variant/30 py-2 text-on-surface font-body text-base focus:border-primary focus:ring-0 outline-none transition-colors"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStep('idle')}
                className="px-6 py-3 bg-surface-container-low text-on-surface-variant font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-surface-container transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={loading}
                className="px-6 py-3 bg-primary text-white font-bold text-[11px] uppercase tracking-widest rounded-xl hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
