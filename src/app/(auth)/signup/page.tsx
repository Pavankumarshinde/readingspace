'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { UserRole } from '@/types'
import { User, Mail, Lock, Phone, Building, MapPin, ArrowRight, Library } from 'lucide-react'

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
        toast.success('Registration successful! Check your email.')
        router.push('/login')
      }
    } catch (err: any) {
      toast.error(err.message || 'Error signing up')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-surface relative overflow-visible py-20">
      {/* Decorative background elements */}
      <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-primary/5 rounded-full blur-3xl opacity-30" />
      <div className="absolute bottom-0 left-0 w-[50%] h-[50%] bg-secondary/5 rounded-full blur-3xl opacity-30" />

      <div className="w-full max-w-xl z-10">
        <div className="text-center mb-10">
          <Link href="/login" className="inline-flex items-center justify-center w-16 h-16 bg-primary text-on-primary rounded-2xl shadow-xl shadow-primary/20 mb-6 hover:scale-105 transition-transform">
             <Library size={30} />
          </Link>
          <h1 className="font-headline text-3xl font-extrabold text-primary tracking-tight italic">Scholar Registration</h1>
          <p className="text-on-surface-variant font-medium mt-1 opacity-60 uppercase tracking-[0.2em] text-[10px]">Select your role to continue</p>
        </div>

        <div className="card p-8 shadow-2xl shadow-primary/5 border-outline-variant/10 bg-white/80 backdrop-blur-sm">
          <form onSubmit={handleSignup} className="space-y-6">
            {/* Role Selector */}
            <div className="tab-bar mb-8">
              <button
                type="button"
                className={`tab-bar-item flex items-center justify-center gap-2 ${role === 'student' ? 'active shadow-lg' : ''}`}
                onClick={() => setRole('student')}
              >
                <User size={16} /> I'm a Student
              </button>
              <button
                type="button"
                className={`tab-bar-item flex items-center justify-center gap-2 ${role === 'manager' ? 'active shadow-lg' : ''}`}
                onClick={() => setRole('manager')}
              >
                <Building size={16} /> I'm a Manager
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="col-span-1 md:col-span-2">
                  <label className="input-label">Full Legal Name</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <User size={18} />
                     </div>
                     <input 
                       type="text" 
                       name="name"
                       required
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                       placeholder="e.g. Julian Thorne"
                       value={formData.name}
                       onChange={handleChange}
                     />
                  </div>
               </div>

               <div>
                  <label className="input-label">Email Address</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <Mail size={18} />
                     </div>
                     <input 
                       type="email" 
                       name="email"
                       required
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                       placeholder="scholar@reading.space"
                       value={formData.email}
                       onChange={handleChange}
                     />
                  </div>
               </div>

               <div>
                  <label className="input-label">Phone Number</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <Phone size={18} />
                     </div>
                     <input 
                       type="tel" 
                       name="phone"
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                       placeholder="+91 98765 43210"
                       value={formData.phone}
                       onChange={handleChange}
                     />
                  </div>
               </div>

               {role === 'manager' && (
                 <>
                   <div>
                      <label className="input-label">Business Name</label>
                      <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
                         <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary">
                            <Building size={18} />
                         </div>
                         <input 
                           type="text" 
                           name="businessName"
                           required
                           className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                           placeholder="Sunrise Hall"
                           value={formData.businessName}
                           onChange={handleChange}
                         />
                      </div>
                   </div>
                   <div>
                      <label className="input-label">Space Address</label>
                      <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
                         <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary">
                            <MapPin size={18} />
                         </div>
                         <input 
                           type="text" 
                           name="address"
                           required
                           className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                           placeholder="Floor 3, City"
                           value={formData.address}
                           onChange={handleChange}
                         />
                      </div>
                   </div>
                 </>
               )}

               <div>
                  <label className="input-label">Choose Password</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <Lock size={18} />
                     </div>
                     <input 
                       type="password" 
                       name="password"
                       required
                       minLength={6}
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                       placeholder="••••••••"
                       value={formData.password}
                       onChange={handleChange}
                     />
                  </div>
               </div>

               <div>
                  <label className="input-label">Confirm Password</label>
                  <div className="flex items-center gap-3 bg-surface-container-low p-1 rounded-2xl border border-outline-variant/10">
                     <div className="w-10 h-10 rounded-xl bg-surface-container-lowest flex-center text-primary shadow-sm">
                        <Lock size={18} />
                     </div>
                     <input 
                       type="password" 
                       name="confirmPassword"
                       required
                       minLength={6}
                       className="flex-1 bg-transparent border-none focus:ring-0 text-[14px] font-semibold" 
                       placeholder="••••••••"
                       value={formData.confirmPassword}
                       onChange={handleChange}
                     />
                  </div>
               </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="btn-gradient w-full py-5 rounded-2xl text-[16px] group/btn"
            >
              <span className="flex items-center justify-center gap-2">
                {loading ? 'Creating Account...' : 'Continue'}
                {!loading && <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform" />}
              </span>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-outline-variant/5 text-center">
             <p className="text-on-surface-variant text-[13px] font-medium font-bold">
                Already part of the network?{' '}
                <Link href="/login" className="text-secondary hover:underline underline-offset-4">
                  Log In
                </Link>
             </p>
          </div>
        </div>
        
        <p className="text-center mt-12 text-[9px] text-outline uppercase font-bold tracking-[0.3em] opacity-40">
           ReadingSpace Premium System
        </p>
      </div>
    </div>
  )
}
