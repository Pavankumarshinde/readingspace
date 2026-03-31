'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { ArrowLeft, MapPin, Edit, Key, Copy, Home, Shield, LogOut } from 'lucide-react'

export default function SpaceProfile() {
  const router = useRouter()
  const supabase = createClient()
  const [radius, setRadius] = useState(200)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const copyKey = () => {
    navigator.clipboard.writeText('RS-4F9K-12')
    toast.success('Space Key copied to clipboard!')
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-md flex items-center justify-between px-6 py-5 w-full sticky top-0 z-50 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="btn-ghost !p-2">
            <ArrowLeft size={20} className="text-primary" />
          </button>
          <h1 className="text-lg font-black text-primary tracking-tight font-headline italic">ReadingSpace</h1>
        </div>
        <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant/30 shadow-sm bg-primary-fixed flex-center text-primary font-bold">
           RA
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 pt-2 pb-32 space-y-6 w-full">
        {/* Header Section */}
        <section className="py-2">
          <h2 className="text-3xl font-black tracking-tighter text-primary font-headline italic">Sunrise Reading Hall</h2>
          <div className="flex items-center gap-1.5 mt-2 text-on-surface-variant group cursor-pointer">
            <MapPin size={16} className="text-secondary" />
            <p className="text-[13px] font-bold uppercase tracking-widest opacity-60">Floor 4, North Wing • Mumbai 400012</p>
          </div>
        </section>

        {/* General Information Consolidated Card */}
        <section>
          <div className="bg-white border border-outline-variant/20 rounded-2xl divide-y divide-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-outline uppercase tracking-[0.2em] mb-1 opacity-60">Manager Email</span>
                <span className="text-[15px] font-bold text-primary italic">manager@reading.space.edu</span>
              </div>
              <button className="text-outline/40 hover:text-primary transition-colors p-2 underline decoration-2 underline-offset-4 decoration-primary/20">
                EDIT
              </button>
            </div>
            <div className="p-5 flex items-center justify-between group hover:bg-surface-container-low transition-colors">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-outline uppercase tracking-[0.2em] mb-1 opacity-60">Contact Phone</span>
                <span className="text-[15px] font-bold text-primary italic">+91 98765 43210</span>
              </div>
              <button className="text-outline/40 hover:text-primary transition-colors p-2 underline decoration-2 underline-offset-4 decoration-primary/20">
                EDIT
              </button>
            </div>
          </div>
        </section>

        {/* Compact Location */}
        <section>
          <div className="bg-white border border-outline-variant/20 rounded-3xl overflow-hidden shadow-lg border-4 border-white">
            <div className="relative h-32 bg-surface-container-highest flex-center overflow-hidden">
               {/* Symbolic static map preview */}
               <div className="absolute inset-0 bg-primary/5 pattern-dots opacity-20" />
               <div className="z-10 w-10 h-10 bg-primary rounded-full flex-center shadow-2xl border-4 border-white animate-bounce">
                  <Home size={20} className="text-white fill-current" />
               </div>
               <div className="absolute top-2 right-4 bg-primary text-white text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded-full">LIVE PREVIEW</div>
            </div>
            <div className="px-5 py-4 flex items-center justify-between bg-surface-container-lowest">
              <p className="text-[11px] text-on-surface-variant font-black uppercase tracking-widest leading-relaxed max-w-[200px]">4th Floor, North Wing, Mumbai 400012</p>
              <button className="text-secondary text-[11px] font-black uppercase tracking-widest hover:underline decoration-2">Change</button>
            </div>
          </div>
        </section>

        {/* Minimal Space Key */}
        <section>
          <div className="bg-primary p-5 rounded-3xl text-white flex items-center justify-between shadow-2xl shadow-primary/20 relative overflow-hidden group">
            <div className="flex items-center gap-4 z-10">
              <div className="bg-white/10 p-3 rounded-2xl backdrop-blur-sm group-hover:scale-110 transition-transform">
                <Key size={20} className="text-secondary" />
              </div>
              <div>
                <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 block mb-0.5">Space Join Key</span>
                <span className="font-mono text-lg font-black tracking-[0.2em] uppercase italic text-primary-fixed">RS·4F9K·12</span>
              </div>
            </div>
            <button 
               onClick={copyKey}
               className="flex items-center gap-2 bg-secondary text-on-secondary px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all active:scale-95 shadow-lg shadow-black/10 z-10"
            >
               <Copy size={16} />
               COPY
            </button>
            <div className="absolute right-[-10%] top-[-50%] w-32 h-32 bg-white/5 rounded-full blur-2xl" />
          </div>
        </section>

        {/* Modern Check-in Radius */}
        <section className="bg-white border border-outline-variant/20 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div className="flex flex-col">
              <h3 className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-1">Check-in Radius</h3>
              <p className="text-[11px] font-bold text-outline uppercase tracking-widest opacity-60 italic">Geofencing Strictness</p>
            </div>
            <span className="text-xs font-black text-white px-4 py-1.5 bg-primary rounded-full shadow-lg border border-primary/20 italic">{radius}m</span>
          </div>
          
          <div className="relative flex items-center h-10">
             <input 
               type="range" 
               min="50" 
               max="1000" 
               step="50"
               value={radius}
               onChange={(e) => setRadius(parseInt(e.target.value))}
               className="w-full h-2 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
             />
          </div>
          
          <div className="flex justify-between mt-3 text-[9px] font-black text-outline uppercase tracking-[0.2em] opacity-40">
            <span>High Precision</span>
            <span>Wide Coverage</span>
          </div>
        </section>

        {/* Account Actions */}
        <section className="space-y-3 pt-6 pb-20">
          <button className="w-full flex items-center justify-between p-5 bg-white border border-outline-variant/10 rounded-2xl hover:bg-surface-container-low transition-all group active:scale-[0.98]">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex-center text-outline group-hover:text-primary transition-colors">
                 <Shield size={22} />
              </div>
              <span className="text-[14px] font-black text-primary uppercase tracking-widest">Manager Credentials</span>
            </div>
            <span className="material-symbols-outlined text-outline-variant text-[24px]">chevron_right</span>
          </button>
          
          <button 
             onClick={handleLogout}
             className="w-full flex items-center gap-4 p-5 bg-error/5 border border-error/10 rounded-2xl hover:bg-error/10 transition-all active:scale-[0.98]"
          >
            <div className="w-10 h-10 rounded-xl bg-error/10 flex-center text-error">
               <LogOut size={22} />
            </div>
            <span className="text-[14px] font-black text-error uppercase tracking-widest">Terminate Session</span>
          </button>
        </section>
      </main>
    </div>
  )
}
