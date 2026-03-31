'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Search, Download, CheckCircle2, XCircle, MoreVertical, LayoutGrid, Filter } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'

export default function ManagerAttendance() {
  const [tab, setTab] = useState<'room1' | 'room2'>('room1')

  const stats = {
    today: '18 / 40',
    avgWeekly: '82%',
    peakDay: 'Wednesday'
  }

  const logs = [
    { name: 'Arjun Reddy', seat: 'B-12', status: 'present', time: '09:12 AM', streak: 12 },
    { name: 'Meera J.', seat: 'C-04', status: 'present', time: '08:45 AM', streak: 22 },
    { name: 'Siddharth Kapoor', seat: 'A-09', status: 'absent', time: '-', streak: 0 },
    { name: 'Priya Mehta', seat: 'B-02', status: 'present', time: '10:30 AM', streak: 8 },
    { name: 'Kabir Mehra', seat: 'D-22', status: 'absent', time: '-', streak: 15 },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="bg-surface/80 backdrop-blur-xl flex justify-between items-center px-6 py-4 w-full sticky top-0 z-40 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary fill-icon">event_available</span>
          <h1 className="font-headline font-bold text-xl tracking-tight text-primary">Attendance Center</h1>
        </div>
        <button className="w-10 h-10 rounded-full bg-surface-container-low text-primary flex-center border border-outline-variant/10 hover:bg-surface-container transition-colors shadow-sm">
           <Download size={18} />
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-8 pb-32 w-full space-y-8">
        {/* Summary Row */}
        <div className="grid grid-cols-2 gap-6">
           <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-primary">
              <span className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-1">Today's Presence</span>
              <span className="text-3xl font-bold text-primary font-headline">{stats.today}</span>
           </div>
           <div className="card p-6 flex flex-col gap-1 border-l-4 border-l-secondary">
              <span className="text-[10px] font-bold text-outline uppercase tracking-[0.2em] mb-1">Weekly Avg</span>
              <span className="text-3xl font-bold text-secondary font-headline">{stats.avgWeekly}</span>
           </div>
        </div>

        <section className="space-y-6">
           <div className="tab-bar">
             <button className={`tab-bar-item ${tab === 'room1' ? 'active' : ''}`} onClick={() => setTab('room1')}>Sunrise Hall</button>
             <button className={`tab-bar-item ${tab === 'room2' ? 'active' : ''}`} onClick={() => setTab('room2')}>The Quiet Zone</button>
           </div>

           {/* Heatmap Section */}
           <div className="card p-6 flex flex-col gap-6">
              <div className="flex-between">
                 <h2 className="text-xl font-bold text-primary font-headline italic">Usage Heatmap</h2>
                 <div className="flex gap-2">
                    <button className="btn-ghost p-1"><ChevronLeft size={18}/></button>
                    <button className="btn-ghost p-1"><ChevronRight size={18}/></button>
                 </div>
              </div>

              {/* Heatmap Grid */}
              <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center py-4">
                 {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                   <span key={d} className="text-[10px] font-bold text-outline uppercase tracking-widest">{d}</span>
                 ))}
                 {Array.from({ length: 30 }).map((_, i) => {
                   const day = i + 1;
                   let style = "cal-dot w-8 h-8 rounded-lg flex-center text-[11px] font-bold";
                   if (day % 7 === 0) style += " bg-secondary/10 text-primary";
                   else if (day % 3 === 0) style += " bg-primary text-white";
                   else style += " bg-secondary text-white";
                   return <div key={i} className="flex-center"><span className={style}>{day}</span></div>
                 })}
              </div>
           </div>
        </section>

        {/* Logs Section */}
        <section className="space-y-6 pb-12">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center px-1">
             <h2 className="text-2xl font-bold text-primary font-headline italic">Daily Activity Log</h2>
             <div className="flex gap-2 w-full md:w-auto">
                <div className="search-wrapper flex-1 md:w-64">
                   <Search size={16} className="search-icon" />
                   <input type="text" className="input py-2.5 text-[13px]" placeholder="Search student..." />
                </div>
                <button className="btn-ghost border border-outline-variant/10 !bg-surface-container-low p-2.5 rounded-xl">
                   <Filter size={20} />
                </button>
             </div>
          </div>

          <div className="flex flex-col gap-4">
            {logs.map((log, i) => (
              <div key={i} className="card p-5 flex-between items-center bg-surface-container-lowest active:scale-[0.99] transition-transform">
                 <div className="flex items-center gap-4">
                    <Avatar name={log.name} size={48} />
                    <div className="flex flex-col">
                       <span className="text-[15px] font-bold text-primary">{log.name}</span>
                       <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-outline uppercase tracking-widest">Seat {log.seat}</span>
                          <span className="w-1 h-1 rounded-full bg-outline-variant" />
                          <span className="text-[10px] font-bold text-secondary uppercase tracking-widest">{log.streak}D Streak</span>
                       </div>
                    </div>
                 </div>
                 
                 <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end">
                       {log.status === 'present' ? (
                         <div className="flex items-center gap-1.5 text-secondary font-bold text-[13px] bg-secondary/10 px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[18px]">verified</span> {log.time}
                         </div>
                       ) : (
                         <div className="flex items-center gap-1.5 text-error font-bold text-[13px] bg-error-container/40 px-3 py-1.5 rounded-full">
                            <span className="material-symbols-outlined text-[18px]">error</span> Absent
                         </div>
                       )}
                    </div>
                    <button className="btn-ghost !bg-surface-container-low border border-outline-variant/10 p-2">
                       <MoreVertical size={16} />
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
