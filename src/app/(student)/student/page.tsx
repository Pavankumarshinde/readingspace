'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { format, startOfMonth, endOfMonth } from 'date-fns'

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
      <div className="flex flex-col min-h-screen items-center justify-center bg-surface text-outline/30">
        <span className="material-symbols-outlined animate-spin mb-4 text-4xl font-light">progress_activity</span>
        <span className="text-[10px] font-black uppercase tracking-[.4em]">Loading your home...</span>
      </div>
    )
  }

  const studentName = profile?.name?.split(' ')[0] || 'Student'

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Visual Identity Section */}
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <p className="text-primary text-[11px] font-black uppercase tracking-[.3em] mb-2 italic">Welcome back</p>
           <h2 className="font-headline text-4xl font-black text-on-surface tracking-tight">Welcome, {studentName}</h2>
           <p className="text-[11px] font-bold text-outline uppercase tracking-[.2em] mt-2 opacity-70">
             {activeSub ? `Currently in ${activeSub.room.name}` : 'Not joined any room yet'}
           </p>
        </div>
        <div className="flex bg-surface-container-low p-1.5 rounded-2xl border border-outline-variant/10 shadow-sm">
           <div className="px-4 py-2 border-r border-outline-variant/10 text-center">
              <p className="text-[8px] font-black text-outline uppercase tracking-[.2em] mb-1">Sessions</p>
              <p className="text-xl font-headline font-black text-primary">{stats.sessions}</p>
           </div>
           <div className="px-4 py-2 text-center">
              <p className="text-[8px] font-black text-outline uppercase tracking-[.2em] mb-1">My Notes</p>
              <p className="text-xl font-headline font-black text-secondary">{stats.notes}</p>
           </div>
        </div>
      </section>

      {/* Main Tactical Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Active Deployment Card */}
        <section className="lg:col-span-12">
          {activeSub ? (
            <div className="card p-8 bg-primary text-on-primary border-none shadow-2xl shadow-primary/20 relative overflow-hidden group">
               <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700" />
               
               <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-8">
                  <div className="space-y-4">
                     <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-[.3em] text-on-primary/60">Students Present</span>
                     </div>
                     <h3 className="font-headline text-3xl font-black italic tracking-tighter uppercase">{activeSub.room.name}</h3>
                     <div className="flex flex-wrap gap-4 pt-2">
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/5">
                           <span className="material-symbols-outlined text-sm">chair</span>
                           <span className="text-xs font-black uppercase">{activeSub.seat_number}</span>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-lg border border-white/5">
                           <span className="material-symbols-outlined text-sm">event_repeat</span>
                           <span className="text-xs font-black uppercase">Expires {format(new Date(activeSub.end_date), 'dd MMM')}</span>
                        </div>
                     </div>
                  </div>
                  <Link href={`/student/rooms/${activeSub.room_id}`} className="shrink-0">
                     <button className="px-8 py-4 bg-white text-primary rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.05] active:scale-95 transition-all shadow-xl">
                        Open Room
                     </button>
                  </Link>
               </div>
            </div>
          ) : (
            <div className="card p-10 bg-surface-container-low border border-dashed border-outline-variant/30 text-center flex flex-col items-center">
               <span className="material-symbols-outlined text-outline/30 text-5xl mb-4 font-light">sensors_off</span>
               <h3 className="font-headline text-xl font-black text-on-surface">No Room Joined</h3>
               <p className="text-[10px] font-bold text-outline uppercase tracking-[.2em] mt-2 mb-8 opacity-60">Join a reading room to see your reading activity</p>
               <Link href="/student/rooms">
                  <button className="px-8 py-3 bg-primary text-on-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/10">Join a Room</button>
               </Link>
            </div>
          )}
        </section>

        {/* Recent Knowledge Logs */}
        <section className="lg:col-span-8 space-y-6">
           <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-3">
                 <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>draw</span>
                 <h4 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Recent Notes</h4>
              </div>
              <Link href="/student/notes" className="text-[9px] font-black text-primary uppercase tracking-widest hover:underline">See All Notes</Link>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {recentNotes.length === 0 ? (
                 <div className="col-span-full h-40 bg-surface-container-low/50 rounded-3xl border border-outline-variant/10 flex items-center justify-center italic text-xs text-outline/40">
                    No notes found.
                 </div>
              ) : recentNotes.map(note => (
                 <Link key={note.id} href="/student/notes">
                    <article className="card p-6 bg-surface-container-low border border-outline-variant/10 group hover:border-secondary/30 transition-all shadow-sm">
                       <time className="text-[8px] font-black text-outline/40 uppercase tracking-widest block mb-2">{format(new Date(note.created_at), 'dd MMM, yy')}</time>
                       <h5 className="font-headline font-black text-on-surface group-hover:text-secondary transition-colors mb-2 line-clamp-1 italic uppercase tracking-tight">{note.title}</h5>
                       <p className="text-[11px] font-medium text-on-surface-variant line-clamp-2 opacity-70 leading-relaxed">{note.content}</p>
                    </article>
                 </Link>
              ))}
           </div>
        </section>

        {/* Pulse & Productivity */}
        <section className="lg:col-span-4 space-y-6">
           <div className="flex items-center gap-3 px-1">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>monitoring</span>
              <h4 className="font-headline text-xl font-black text-on-surface tracking-tight uppercase italic">Your Progress</h4>
           </div>
           <div className="card p-6 bg-surface-container-low border border-outline-variant/10 h-[260px] flex flex-col justify-between">
              <div className="space-y-4">
                 <div className="flex justify-between items-center bg-surface px-4 py-3 rounded-xl border border-outline-variant/5">
                    <p className="text-[9px] font-black text-outline uppercase tracking-widest">Consistency</p>
                    <div className="flex gap-1">
                       {[1,2,3,4,5].map(i => (
                          <span key={i} className={`material-symbols-outlined text-[10px] ${i <= 3 ? 'text-primary fill-icon' : 'text-outline/20'}`}>star</span>
                       ))}
                    </div>
                 </div>
                 <div className="flex justify-between items-center bg-surface px-4 py-3 rounded-xl border border-outline-variant/5">
                    <p className="text-[9px] font-black text-outline uppercase tracking-widest">Focus Status</p>
                    <p className="text-[10px] font-black text-secondary uppercase tracking-tight italic">Very Good</p>
                 </div>
              </div>
              
              <div className="pt-6 border-t border-outline-variant/10 mt-auto">
                 <p className="text-[8px] font-black text-outline uppercase tracking-widest mb-2 opacity-50 italic">Last Updated: {format(new Date(), 'HH:mm:ss x')}</p>
              </div>
           </div>
        </section>
      </div>
    </div>
  )
}
