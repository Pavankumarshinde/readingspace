'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { UserRole } from '@/types'
import { User, Mail, Lock, Phone, Building, MapPin, ArrowRight, BookOpen } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>('student')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    address: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            role: role,
            phone: formData.phone,
            business_name: role === 'manager' ? formData.businessName : null,
            address: role === 'manager' ? formData.address : null,
          },
        },
      })
      if (error) throw error
      if (data.user) {
        toast.success('Account created! Check your email.')
        router.push('/login')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error signing up')
    } finally {
      setLoading(false)
    }
  }

  const inputRow = (icon: React.ReactNode, content: React.ReactNode) => (
    <div className="flex items-center gap-3 bg-surface-container-low/60 px-3 py-2.5 rounded-2xl border border-transparent focus-within:border-outline-variant/20 focus-within:bg-surface-container-lowest transition-all group">
      <div className="text-primary/60 shrink-0 group-focus-within:text-primary transition-colors">{icon}</div>
      {content}
    </div>
  )

  const inputClass = "flex-1 bg-transparent border-none focus:ring-0 text-sm font-medium text-on-surface placeholder:text-on-surface-variant/30 outline-none"

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 bg-surface relative overflow-hidden font-body">
      <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-secondary/[0.05] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-[420px] z-10 flex flex-col">

        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-11 h-11 bg-surface-container-lowest text-primary rounded-2xl shadow-sm border border-outline-variant/10 flex items-center justify-center mb-3">
            <BookOpen size={22} strokeWidth={1.5} />
          </div>
          <h1 className="font-headline text-3xl font-extrabold text-on-surface tracking-tight">
            Reading<span className="text-primary">Space</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mt-1">
            Create your account
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface-container-lowest/90 backdrop-blur-2xl rounded-3xl p-6 border border-outline-variant/10 shadow-xl shadow-primary/5">

          <form onSubmit={handleSignup} className="space-y-4">
            {/* Role toggle */}
            <div className="flex gap-1 p-1 bg-surface-container-low rounded-2xl mb-2">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${role === 'student' ? 'bg-white shadow-sm text-primary' : 'text-on-surface/40'}`}
              >
                <User size={13} /> Student
              </button>
              <button
                type="button"
                onClick={() => setRole('manager')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${role === 'manager' ? 'bg-white shadow-sm text-primary' : 'text-on-surface/40'}`}
              >
                <Building size={13} /> Manager
              </button>
            </div>

            <div className="space-y-3">
              {/* Full Name */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Full Name</label>
                {inputRow(<User size={16} />, <input type="text" name="name" required className={inputClass} placeholder="e.g. Rahul Sharma" value={formData.name} onChange={handleChange} />)}
              </div>

              {/* Email */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Email ID</label>
                {inputRow(<Mail size={16} />, <input type="email" name="email" required className={inputClass} placeholder="your@email.com" value={formData.email} onChange={handleChange} />)}
              </div>

              {/* Phone */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Phone Number</label>
                {inputRow(<Phone size={16} />, <input type="tel" name="phone" className={inputClass} placeholder="+91 98765 43210" value={formData.phone} onChange={handleChange} />)}
              </div>

              {/* Manager extras */}
              {role === 'manager' && (
                <>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Reading Space Name</label>
                    {inputRow(<Building size={16} />, <input type="text" name="businessName" required className={inputClass} placeholder="Sunrise Study Hall" value={formData.businessName} onChange={handleChange} />)}
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Address</label>
                    {inputRow(<MapPin size={16} />, <input type="text" name="address" required className={inputClass} placeholder="Floor 3, MG Road, Pune" value={formData.address} onChange={handleChange} />)}
                  </div>
                </>
              )}

              {/* Password */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Password</label>
                {inputRow(<Lock size={16} />, <input type="password" name="password" required minLength={6} className={inputClass} placeholder="Min. 6 characters" value={formData.password} onChange={handleChange} />)}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest mb-1.5 block pl-1">Confirm Password</label>
                {inputRow(<Lock size={16} />, <input type="password" name="confirmPassword" required minLength={6} className={inputClass} placeholder="••••••••" value={formData.confirmPassword} onChange={handleChange} />)}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-on-surface text-surface py-3.5 rounded-2xl text-[12px] font-bold uppercase tracking-widest shadow-md hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-70 mt-2"
            >
              {loading ? 'Creating account…' : 'Create Account'}
              {!loading && <ArrowRight size={15} className="opacity-70" />}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-outline-variant/10 text-center">
            <p className="text-xs text-on-surface-variant/60">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-bold hover:opacity-70 transition-opacity">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center mt-5 text-[9px] text-on-surface-variant/30 font-bold tracking-widest uppercase">
          ReadingSpace © 2025
        </p>
      </div>
    </div>
  )
}
