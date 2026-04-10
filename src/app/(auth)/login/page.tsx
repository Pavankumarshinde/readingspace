'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Lock, ArrowRight, Library } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

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
          router.push('/manager/dashboard')
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 relative overflow-hidden font-body">
      {/* Decorative background gradients */}
      <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-primary/10 rounded-full blur-[120px] opacity-60 animate-pulse-slow" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[60%] h-[60%] bg-secondary/10 rounded-full blur-[120px] opacity-60" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary text-white rounded-[2rem] shadow-2xl shadow-primary/30 mb-8 group transition-transform hover:scale-110 active:scale-95 border-4 border-white">
             <Library size={40} />
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">
            Reading<span className="text-primary">Space</span>
          </h1>
          <p className="text-on-surface-variant font-semibold mt-3 text-sm tracking-wide opacity-80">Premium Reading Room Experience</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-10 border border-slate-200/60 shadow-[0_20px_50px_-12px_rgba(79,70,229,0.12)]">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-2.5 block ml-1">Email Address</label>
              <div className="flex items-center gap-4 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/30 transition-all">
                 <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                    <Mail size={20} />
                 </div>
                 <input 
                   type="email" 
                   required
                   className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-bold text-on-surface placeholder:text-slate-400" 
                   placeholder="name@example.com"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-on-surface-variant mb-2.5 block ml-1">Password</label>
              <div className="flex items-center gap-4 bg-slate-50/50 p-1.5 rounded-2xl border border-slate-200 focus-within:ring-4 focus-within:ring-primary/5 focus-within:border-primary/30 transition-all">
                 <div className="w-11 h-11 rounded-xl bg-white flex items-center justify-center text-primary shadow-sm border border-slate-100">
                    <Lock size={20} />
                 </div>
                 <input 
                   type="password" 
                   required
                   className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-bold text-on-surface placeholder:text-slate-400" 
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-primary text-white py-4.5 rounded-2xl text-[15px] font-bold shadow-xl shadow-primary/25 hover:shadow-2xl hover:shadow-primary/30 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
            >
              <span className="flex items-center justify-center gap-2">
                 {loading ? 'Entering...' : 'Log In to Account'}
                {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-slate-100 text-center">
             <p className="text-on-surface-variant text-[14px] font-medium">
                New member?{' '}
                <Link href="/signup" className="text-primary font-bold hover:underline underline-offset-4 decoration-2 transition-all">
                  Get Started
                </Link>
             </p>
          </div>
        </div>
        
        <p className="text-center mt-12 text-[11px] text-slate-400 font-bold tracking-widest">
           READINGSPACE© 2026 • SMART MANAGEMENT
        </p>
      </div>
    </div>
  )
}
