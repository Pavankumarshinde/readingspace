'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, Library, KeyRound, ChevronLeft } from 'lucide-react'

type AuthMode = 'login' | 'forgot_password' | 'verify_otp' | 'reset_password';

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')
  
  // Form State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [resetToken, setResetToken] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Fetch role directly to avoid intermediate redirects
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single()

        toast.success('Welcome back!')
        
        // Redirect directly to the correct dashboard
        if (profile?.role === 'manager') {
          router.push('/manager/rooms')
        } else {
          router.push('/student/rooms')
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid login credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast.error('Please enter your email first')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to send recovery code')
      
      toast.success('Recovery code sent to your email')
      setMode('verify_otp')
    } catch (err: any) {
      toast.error(err.message || 'Failed to send recovery code')
    } finally {
      setLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!otp) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: email, otpCode: otp })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invalid or expired code')
      
      setResetToken(data.resetToken)
      toast.success('Code verified successfully!')
      setMode('reset_password')
    } catch (err: any) {
      toast.error(err.message || 'Invalid or expired code')
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword || newPassword.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to update password')
      
      toast.success('Password updated successfully! Please log in.')
      setMode('login')
      setPassword(newPassword)
    } catch (err: any) {
      toast.error(err.message || 'Failed to update password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface relative overflow-hidden font-body">
      {/* Editorial aesthetic background gradients */}
      <div className="absolute -top-[20%] -right-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/10 blur-[140px] opacity-70 animate-pulse-slow pointer-events-none" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[60vw] h-[60vw] rounded-full bg-secondary/5 blur-[120px] opacity-60 pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 flex flex-col pt-12 pb-8">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-surface-container-lowest text-primary rounded-3xl shadow-sm border border-outline-variant/10 mb-6 group transition-transform hover:scale-105">
             <Library size={32} strokeWidth={1.5} className="opacity-80" />
          </div>
          <h1 className="font-headline text-5xl font-extrabold text-on-surface tracking-tighter mix-blend-multiply">
            Reading<span className="text-primary opacity-90">Space</span>
          </h1>
          <p className="text-on-surface-variant/80 font-bold mt-4 text-[11px] uppercase tracking-[0.2em] opacity-80">
            Premium Study Environment
          </p>
        </div>

        <div className="bg-surface-container-lowest/80 backdrop-blur-2xl rounded-[3rem] p-8 md:p-10 border border-outline-variant/10 shadow-2xl shadow-primary/5">
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-7 animate-in fade-in zoom-in-[0.98] duration-500">
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3 block pl-2">Security ID</label>
                  <div className="flex items-center gap-4 bg-surface-container-low/50 p-2 rounded-3xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                     <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70 shadow-inner group-focus-within:bg-primary/5 group-focus-within:text-primary transition-colors">
                        <Mail size={18} strokeWidth={2} />
                     </div>
                     <input 
                       type="email" 
                       required
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] font-bold text-on-surface placeholder:text-on-surface-variant/30 placeholder:font-normal" 
                       placeholder="manager@domain.com"
                       value={email}
                       onChange={(e) => setEmail(e.target.value)}
                     />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-3 px-2">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">Access Key</label>
                    <button 
                      type="button" 
                      onClick={() => setMode('forgot_password')}
                      className="text-[10px] font-extrabold text-primary hover:text-primary/70 tracking-wide transition-colors"
                    >
                      FORGOT KEY?
                    </button>
                  </div>
                  <div className="flex items-center gap-4 bg-surface-container-low/50 p-2 rounded-3xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                     <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70 shadow-inner group-focus-within:bg-primary/5 group-focus-within:text-primary transition-colors">
                        <Lock size={18} strokeWidth={2} />
                     </div>
                     <input 
                       type="password" 
                       required
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] font-bold tracking-[0.2em] text-on-surface placeholder:text-on-surface-variant/30 placeholder:font-normal placeholder:tracking-normal" 
                       placeholder="••••••••"
                       value={password}
                       onChange={(e) => setPassword(e.target.value)}
                     />
                  </div>
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-on-surface text-surface py-5 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest shadow-xl shadow-on-surface/10 hover:shadow-2xl hover:shadow-on-surface/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
              >
                <span className="flex items-center justify-center gap-3">
                   {loading ? 'Authenticating...' : 'Enter Console'}
                  {!loading && <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform opacity-70" />}
                </span>
              </button>
            </form>
          )}

          {mode === 'forgot_password' && (
            <form onSubmit={handleForgotPassword} className="space-y-7 animate-in fade-in zoom-in-[0.98] duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-headline italic font-bold text-on-surface">System Recovery</h2>
                <p className="text-[13px] text-on-surface-variant/60 font-medium mt-2 leading-relaxed px-4">Enter your registered identity to receive a secure recovery code via email.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3 block pl-2">Identity Email</label>
                <div className="flex items-center gap-4 bg-surface-container-low/50 p-2 rounded-3xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70 shadow-inner group-focus-within:bg-primary/5 group-focus-within:text-primary transition-colors">
                      <Mail size={18} strokeWidth={2} />
                   </div>
                   <input 
                     type="email" 
                     required
                     className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] font-bold text-on-surface placeholder:text-on-surface-variant/30 placeholder:font-normal" 
                     placeholder="manager@domain.com"
                     value={email}
                     onChange={(e) => setEmail(e.target.value)}
                   />
                </div>
              </div>

              <div className="space-y-4 pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-on-surface text-surface py-5 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? 'Transmitting...' : 'Dispatch Code'}
                </button>
                <button 
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full py-4 bg-surface-container-lowest text-on-surface-variant rounded-[2rem] border border-outline-variant/20 text-[11px] font-bold uppercase tracking-widest hover:bg-surface-container-low transition-all flex items-center justify-center gap-2"
                >
                  <ChevronLeft size={16} strokeWidth={2.5} /> Return
                </button>
              </div>
            </form>
          )}

          {mode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-7 animate-in fade-in zoom-in-[0.98] duration-500">
              <div className="text-center mb-8">
                 <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 text-primary rounded-full mb-6">
                    <KeyRound size={28} strokeWidth={1.5} />
                 </div>
                <h2 className="text-2xl font-headline italic font-bold text-on-surface">Verification</h2>
                <p className="text-[13px] text-on-surface-variant/60 font-medium mt-2 leading-relaxed px-4">
                  Check <span className="font-bold text-on-surface-variant">{email}</span> for the 6-digit access code.
                </p>
              </div>

              <div>
                <input 
                  type="text" 
                  required
                  maxLength={6}
                  className="w-full bg-surface-container-low/50 border border-outline-variant/10 focus:border-primary/30 focus:bg-surface-container-lowest rounded-3xl p-6 text-center text-3xl font-bold tracking-[0.5em] text-on-surface placeholder:text-on-surface-variant/20 transition-all outline-none" 
                  placeholder="000000"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.trim())}
                />
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading || otp.length < 6}
                  className="w-full bg-primary text-white py-5 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:shadow-2xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? 'Verifying...' : 'Confirm Code'}
                </button>
              </div>
            </form>
          )}

          {mode === 'reset_password' && (
            <form onSubmit={handleResetPassword} className="space-y-7 animate-in fade-in zoom-in-[0.98] duration-500">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-headline italic font-bold text-on-surface">Update Key</h2>
                <p className="text-[13px] text-on-surface-variant/60 font-medium mt-2 leading-relaxed px-4">Establish a new secure access key for your environment.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-3 block pl-2">New Access Key</label>
                <div className="flex items-center gap-4 bg-surface-container-low/50 p-2 rounded-3xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
                   <div className="w-12 h-12 rounded-2xl bg-surface-container flex items-center justify-center text-primary/70 shadow-inner group-focus-within:bg-primary/5 group-focus-within:text-primary transition-colors">
                      <Lock size={18} strokeWidth={2} />
                   </div>
                   <input 
                     type="password" 
                     required
                     className="flex-1 bg-transparent border-none focus:ring-0 text-[16px] font-bold tracking-[0.2em] text-on-surface placeholder:text-on-surface-variant/30 placeholder:font-normal placeholder:tracking-normal" 
                     placeholder="••••••••"
                     value={newPassword}
                     onChange={(e) => setNewPassword(e.target.value)}
                   />
                </div>
              </div>

              <div className="pt-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-on-surface text-surface py-5 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest shadow-xl shadow-on-surface/10 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? 'Encrypting...' : 'Install Key'}
                </button>
              </div>
            </form>
          )}

          {mode === 'login' && (
            <div className="mt-12 pt-8 border-t border-outline-variant/10 text-center animate-in fade-in">
               <p className="text-on-surface-variant/80 text-[12px] font-bold uppercase tracking-widest">
                  Not enrolled?{' '}
                  <Link href="/signup" className="text-primary font-extrabold hover:text-primary/70 transition-colors">
                    Request Access
                  </Link>
               </p>
            </div>
          )}
        </div>
        
        <p className="text-center mt-12 text-[10px] text-on-surface-variant/40 font-bold tracking-[0.3em] uppercase">
           ReadingSpace Architecture
        </p>
      </div>
    </div>
  )
}

