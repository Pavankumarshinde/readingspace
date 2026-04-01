'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'

export default function StudentHome() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<any>(null)
  const [activeSub, setActiveSub] = useState<any>(null)
  const [stats, setStats] = useState({ sessions: 0, notes: 0 })
  const [recentNotes, setRecentNotes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboard() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const [
        { data: profileData },
        { data: subData },
        { count: attendanceCount },
        { data: notesData, count: notesCount }
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('subscriptions').select('*, room:rooms(*)').eq('student_id', user.id).eq('status', 'active').maybeSingle(),
        supabase.from('attendance_logs').select('*', { count: 'exact', head: true }).eq('student_id', user.id),
        supabase.from('notes').select('*', { count: 'exact' }).eq('student_id', user.id).order('created_at', { ascending: false }).limit(3)
      ])

      if (profileData) setProfile(profileData)
      if (subData) setActiveSub(subData)
      setStats({ sessions: attendanceCount || 0, notes: notesCount || 0 })
      if (notesData) setRecentNotes(notesData)
      
      setLoading(false)
    }
    fetchDashboard()
  }, [router, supabase])

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen items-center justify-center bg-slate-50 text-slate-400">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4"></div>
        <span className="text-xs font-bold uppercase tracking-widest opacity-60">Preparing your space...</span>
      </div>
    )
  }

  const studentName = profile?.name?.split(' ')[0] || 'Student'

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Welcome & Stats Header */}
      <section className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
           <p className="text-primary text-xs font-bold uppercase tracking-widest mb-1.5">Learning Journey</p>
           <h2 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight">Good day, {studentName}!</h2>
           <p className="text-sm font-medium text-on-surface-variant mt-2 opacity-80">
             {activeSub ? `You're currently active in ${activeSub.room.name}` : 'Ready to start your next study session?'}
           </p>
        </div>
        <div className="flex bg-white p-2 rounded-3xl border border-slate-200 shadow-sm">
           <div className="px-6 py-3 border-r border-slate-100 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Sessions</p>
              <p className="text-2xl font-extrabold text-primary">{stats.sessions}</p>
           </div>
           <div className="px-6 py-3 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">My Notes</p>
              <p className="text-2xl font-extrabold text-secondary">{stats.notes}</p>
           </div>
        </div>
      </section>

      {/* Main Dashboard Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active Membership Card */}
        <section className="lg:col-span-12">
          {activeSub ? (
            <div className="card p-10 bg-gradient-to-br from-primary to-indigo-700 text-white border-none shadow-2xl shadow-primary/30 relative overflow-hidden group">
               {/* Decorative mesh */}
               <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-400/20 rounded-full blur-[100px] -mr-48 -mt-48 transition-transform duration-700 group-hover:scale-125" />
               <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-400/20 rounded-full blur-[80px] -ml-32 -mb-32 transition-transform duration-700 group-hover:translate-x-10" />
               
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-6">
                     <div className="flex items-center gap-3">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)] animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-white/80">Active Study Session</span>
                     </div>
                     <h3 className="font-headline text-4xl font-extrabold tracking-tight">{activeSub.room.name}</h3>
                     <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
                           <span className="material-symbols-outlined text-lg">chair</span>
                           <span className="text-sm font-bold">SEAT {activeSub.seat_number}</span>
                        </div>
                        <div className="flex items-center gap-3 px-4 py-2.5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-sm">
                           <span className="material-symbols-outlined text-lg">calendar_today</span>
                           <span className="text-sm font-bold uppercase">Expires {format(new Date(activeSub.end_date), 'dd MMM')}</span>
                        </div>
                     </div>
                  </div>
                  <Link href={`/student/rooms/${activeSub.room_id}`} className="shrink-0">
                     <button className="px-10 py-4.5 bg-white text-primary rounded-2xl text-sm font-extrabold shadow-2xl shadow-black/10 hover:shadow-black/20 hover:scale-105 active:scale-95 transition-all">
                        Resume Learning
                     </button>
                  </Link>
               </div>
            </div>
          ) : (
            <div className="card p-12 bg-white border-2 border-dashed border-slate-200 text-center flex flex-col items-center">
               <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-6 shadow-inner">
                  <span className="material-symbols-outlined text-4xl">add_location_alt</span>
               </div>
               <h3 className="text-2xl font-extrabold text-on-surface">No active room found</h3>
               <p className="text-sm font-medium text-slate-500 mt-2 mb-10 max-w-sm">Join a reading room to keep track of your daily sessions, notes, and study progress.</p>
               <Link href="/student/rooms">
                  <button className="btn-primary">Find a Reading Room</button>
               </Link>
            </div>
          )}
        </section>

        {/* Knowledge Base / Recent Notes */}
        <section className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary border border-secondary/5">
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>edit_square</span>
                 </div>
                 <h4 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Recent Notes</h4>
              </div>
              <Link href="/student/notes" className="text-xs font-bold text-primary hover:text-indigo-700 transition-colors">See All Notes</Link>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentNotes.length === 0 ? (
                 <div className="col-span-full h-40 bg-slate-50 rounded-[2rem] border border-slate-200 border-dashed flex items-center justify-center text-sm font-medium text-slate-400">
                    Your knowledge bank is empty.
                 </div>
              ) : recentNotes.map(note => (
                   <Link key={note.id} href="/student/notes">
                    <article className="card p-10 bg-white border border-slate-100 group hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/10 transition-all cursor-pointer h-full flex flex-col">
                       <time className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">{format(new Date(note.created_at), 'dd MMM, yyyy')}</time>
                       <h5 className="text-lg font-extrabold text-on-surface group-hover:text-primary transition-colors mb-3 line-clamp-1">{note.title}</h5>
                       <p className="text-sm font-medium text-on-surface-variant line-clamp-2 opacity-80 leading-relaxed">{note.content}</p>
                       <div className="mt-auto pt-6 flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                          <span className="text-[11px] font-bold uppercase tracking-widest">Read More</span>
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                       </div>
                    </article>
                 </Link>
              ))}
           </div>
        </section>

        {/* Analytics / Progress Sidebar */}
        <section className="lg:col-span-4 space-y-6">
           <div className="flex items-center gap-3 px-1">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/5">
                 <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_graph</span>
              </div>
              <h4 className="font-headline text-xl font-extrabold text-on-surface tracking-tight">Study Analytics</h4>
           </div>
            <div className="card p-10 bg-white border border-slate-100 h-full flex flex-col">
              <div className="space-y-6">
                 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-primary/10 group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Consistency Score</p>
                    <div className="flex items-center justify-between">
                       <div className="flex gap-1.5">
                          {[1,2,3,4,5].map(i => (
                             <span key={i} className={`material-symbols-outlined text-sm ${i <= 4 ? 'text-primary' : 'text-slate-200'}`} style={{ fontVariationSettings: i <= 4 ? "'FILL' 1" : "" }}>verified</span>
                          ))}
                       </div>
                       <span className="text-xs font-extrabold text-primary">80%</span>
                    </div>
                 </div>
                 <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 transition-colors hover:bg-white hover:border-secondary/10 group">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Focus Level</p>
                    <div className="flex items-center justify-between">
                       <p className="text-sm font-extrabold text-secondary tracking-tight">Peak Optimal</p>
                       <span className="w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(6,182,212,0.6)]" />
                    </div>
                 </div>
              </div>
              
              <div className="pt-10 border-t border-slate-100 mt-auto">
                 <p className="text-[11px] font-bold text-slate-400 flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                   Real-time sync active
                 </p>
              </div>
           </div>
        </section>
      </div>
    </div>
  )
}
