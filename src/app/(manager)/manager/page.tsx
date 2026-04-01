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
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h2 className="section-header">Attendance Overview</h2>
          <p className="text-[11px] text-on-surface-variant font-medium uppercase tracking-wider mt-1">Live tracking & reports</p>
        </div>
        <button className="btn-sm-minimal">
          <span className="material-symbols-outlined icon-xs">download</span>
          <span>Report</span>
        </button>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Today's Presence", value: stats.today, icon: "person_check", color: "text-primary" },
          { label: "Weekly Avg", value: stats.avgWeekly, icon: "trending_up", color: "text-secondary" },
          { label: "Peak Day", value: stats.peakDay, icon: "leaderboard", color: "text-tertiary" }
        ].map((s, i) => (
          <div key={i} className="card p-4 flex items-center justify-between group hover:border-primary/30 transition-all">
            <div>
               <p className="text-[9px] font-bold text-outline uppercase tracking-widest mb-1">{s.label}</p>
               <p className={`font-headline text-lg font-bold ${s.color}`}>{s.value}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center text-outline group-hover:text-primary transition-colors">
               <span className="material-symbols-outlined">{s.icon}</span>
            </div>
          </div>
        ))}
      </section>

      {/* Tabs */}
      <div className="tab-bar max-w-xs">
        <button className={`tab-bar-item ${tab === 'room1' ? 'active' : ''}`} onClick={() => setTab('room1')}>Main Room</button>
        <button className={`tab-bar-item ${tab === 'room2' ? 'active' : ''}`} onClick={() => setTab('room2')}>Annex Hall</button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Heatmap Widget */}
        <section className="card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-headline text-sm font-semibold text-on-surface">Usage Heatmap</h3>
            <div className="flex gap-1">
              <button className="btn-ghost"><span className="material-symbols-outlined icon-xs">chevron_left</span></button>
              <button className="btn-ghost"><span className="material-symbols-outlined icon-xs">chevron_right</span></button>
            </div>
          </div>
          
          <div className="grid grid-cols-7 gap-y-3 text-center mb-4">
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
              <span key={d} className="text-[10px] font-bold text-outline/50 uppercase tracking-widest">{d}</span>
            ))}
            {Array.from({ length: 30 }).map((_, i) => {
              const day = i + 1;
              const intensity = day % 7 === 0 ? 'bg-surface-container-high' : day % 3 === 0 ? 'bg-primary text-white' : 'bg-primary/40 text-white';
              return (
                <div key={i} className="flex items-center justify-center py-1">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-bold ${intensity}`}>
                    {day}
                  </span>
                </div>
              )
            })}
          </div>
        </section>

        {/* Logs Widget */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline text-sm font-semibold text-on-surface">Recent Activity</h3>
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-2.5 text-outline/50 icon-xs">search</span>
              <input type="text" placeholder="Filter..." className="bg-surface-container-low border border-outline-variant/30 rounded-lg pl-8 pr-3 py-1.5 text-[11px] w-32 md:w-48 focus:outline-none focus:ring-1 focus:ring-primary/20" />
            </div>
          </div>

          <div className="space-y-2">
            {logs.map((log, i) => (
              <div key={i} className="card p-3 flex items-center justify-between bg-surface-container-lowest/50 hover:bg-surface-container-lowest transition-colors group">
                <div className="flex items-center gap-3">
                  <Avatar name={log.name} size={32} />
                  <div>
                    <p className="text-xs font-bold text-on-surface group-hover:text-primary transition-colors">{log.name}</p>
                    <p className="text-[9px] font-bold text-outline uppercase tracking-widest">Seat {log.seat}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className={`flex items-center justify-end gap-1 text-[11px] font-bold ${log.status === 'present' ? 'text-secondary' : 'text-error'}`}>
                      <span className="material-symbols-outlined icon-xs">{log.status === 'present' ? 'check_circle' : 'cancel'}</span>
                      <span>{log.status === 'present' ? log.time : 'Absent'}</span>
                    </div>
                    <p className="text-[9px] font-bold text-outline/60 uppercase tracking-widest mt-0.5">🚀 {log.streak}d Streak</p>
                  </div>
                  <button className="btn-ghost group-hover:text-primary"><span className="material-symbols-outlined icon-sm">more_vert</span></button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
