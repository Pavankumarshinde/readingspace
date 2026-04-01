'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Mail, Lock, LogIn, ArrowRight } from 'lucide-react'

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-3xl opacity-50" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-secondary/10 rounded-full blur-3xl opacity-50" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary text-on-primary rounded-3xl shadow-2xl shadow-primary/30 mb-6 group transition-transform hover:scale-105 active:scale-95">
             <span className="material-symbols-outlined text-[40px] fill-icon">menu_book</span>
          </div>
          <h1 className="font-headline text-4xl font-extrabold text-primary tracking-tight italic">ReadingSpace</h1>
          <p className="text-on-surface-variant font-medium mt-2 opacity-60 uppercase tracking-[0.2em] text-[11px]">Premium Knowledge Quarters</p>
        </div>

        <div className="card p-8 shadow-2xl shadow-primary/5 border-outline-variant/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="input-label">Educational Email</label>
              <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 transition-all focus-within:ring-2 focus-within:ring-primary/10">
                 <div className="w-11 h-11 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                    <Mail size={20} />
                 </div>
                 <input 
                   type="email" 
                   required
                   className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-semibold" 
                   placeholder="scholar@reading.space"
                   value={email}
                   onChange={(e) => setEmail(e.target.value)}
                 />
              </div>
            </div>

            <div>
              <label className="input-label">Security Password</label>
              <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 transition-all focus-within:ring-2 focus-within:ring-primary/10">
                 <div className="w-11 h-11 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                    <Lock size={20} />
                 </div>
                 <input 
                   type="password" 
                   required
                   className="flex-1 bg-transparent border-none focus:ring-0 text-[15px] font-semibold" 
                   placeholder="••••••••"
                   value={password}
                   onChange={(e) => setPassword(e.target.value)}
                 />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-gradient w-full py-5 rounded-2xl text-[16px] group/btn"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? 'Authenticating...' : 'Enter ReadingSpace'}
                {!loading && <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/5 text-center">
             <p className="text-on-surface-variant text-[13px] font-medium">
                New to the platform?{' '}
                <Link href="/signup" className="text-secondary font-bold hover:underline underline-offset-4">
                  Create Account
                </Link>
             </p>
          </div>
        </div>
        
        <p className="text-center mt-12 text-[10px] text-outline uppercase font-bold tracking-widest opacity-40">
           ReadingSpace v1.0 • Built for Scholars
        </p>
      </div>
    </div>
  )
}
