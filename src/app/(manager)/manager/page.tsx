'use client'

import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Search, Download, CheckCircle2, XCircle, MoreVertical, LayoutGrid } from 'lucide-react'
import Avatar from '@/components/ui/Avatar'
import { formatDate } from '@/lib/utils'

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
    <div className="flex flex-col gap-6 p-5">
      <header className="flex-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold text-[var(--navy)]">Attendance</h1>
          <p className="text-[13px] text-[var(--text-secondary)]">Live tracking and historical usage reports.</p>
        </div>
        <button className="bg-[var(--surface-2)] p-3 rounded-xl border border-[var(--border)] flex-center">
           <Download size={20} className="text-[var(--text-secondary)]" />
        </button>
      </header>

      {/* Summary Row */}
      <div className="grid grid-cols-2 gap-4">
         <div className="card p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Today's Presence</span>
            <span className="text-2xl font-bold text-[var(--navy)]">{stats.today}</span>
         </div>
         <div className="card p-4 flex flex-col gap-1">
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">Weekly Avg</span>
            <span className="text-2xl font-bold text-[var(--teal)]">{stats.avgWeekly}</span>
         </div>
      </div>

      <div className="tab-bar">
        <button className={`tab-bar-item ${tab === 'room1' ? 'active' : ''}`} onClick={() => setTab('room1')}>Room 1</button>
        <button className={`tab-bar-item ${tab === 'room2' ? 'active' : ''}`} onClick={() => setTab('room2')}>Room 2</button>
      </div>

      {/* Heatmap Section */}
      <section className="card p-5 flex flex-col gap-4">
        <div className="flex-between">
           <h2 className="text-lg font-bold text-[var(--navy)]">Usage Heatmap</h2>
           <div className="flex gap-2">
              <button className="btn-ghost p-1"><ChevronLeft size={18}/></button>
              <button className="btn-ghost p-1"><ChevronRight size={18}/></button>
           </div>
        </div>

        {/* Mock Heatmap Grid */}
        <div className="grid grid-cols-7 gap-y-3 gap-x-1 text-center">
           {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
             <span key={d} className="text-[10px] font-bold text-[var(--text-muted)] mb-1">{d}</span>
           ))}
           {Array.from({ length: 30 }).map((_, i) => {
             const day = i + 1;
             let style = "cal-dot";
             if (day % 7 === 0) style += " cal-dot-low";
             else if (day % 3 === 0) style += " cal-dot-peak text-white";
             else style += " cal-dot-medium text-white";
             return <div key={i} className="flex-center"><span className={style}>{day}</span></div>
           })}
        </div>
      </section>

      {/* Logs Section */}
      <section className="flex flex-col gap-4 mb-20">
        <div className="flex-between mb-1">
           <h2 className="text-xl font-bold text-[var(--navy)]">Daily Log</h2>
           <div className="search-wrapper w-40">
              <Search size={14} className="search-icon" />
              <input type="text" className="input py-2 text-[12px]" placeholder="Search student..." />
           </div>
        </div>

        <div className="flex flex-col gap-3">
          {logs.map((log, i) => (
            <div key={i} className="card p-4 flex-between items-center bg-white">
               <div className="flex items-center gap-3">
                  <Avatar name={log.name} size={40} />
                  <div className="flex flex-col">
                     <span className="text-[14px] font-bold text-[var(--navy)]">{log.name}</span>
                     <span className="text-[11px] text-[var(--text-muted)] font-bold uppercase tracking-wider">SEAT {log.seat}</span>
                  </div>
               </div>
               <div className="flex items-center gap-4">
                  <div className="flex flex-col items-end">
                     {log.status === 'present' ? (
                       <div className="flex items-center gap-1 text-[var(--teal)] font-bold text-[13px]">
                          <CheckCircle2 size={14} /> {log.time}
                       </div>
                     ) : (
                       <div className="flex items-center gap-1 text-[var(--red)] font-bold text-[13px]">
                          <XCircle size={14} /> Absent
                       </div>
                     )}
                     <span className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider opacity-60">
                        Streak: {log.streak}d
                     </span>
                  </div>
                  <button className="btn-ghost p-1"><MoreVertical size={18} /></button>
               </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
