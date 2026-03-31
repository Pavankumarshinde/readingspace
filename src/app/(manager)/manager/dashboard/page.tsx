'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, ArrowRight, Info } from 'lucide-react'
import Link from 'next/link'

export default function ManagerDashboard() {
  const expiringPlans = [
    { name: 'Arjun Reddy', initial: 'AR', seat: 'B-12', expiry: 'Oct 24, 2023', daysLeft: '2d' },
    { name: "Sara D'Souza", initial: 'SD', seat: 'A-05', expiry: 'Oct 25, 2023', daysLeft: '3d' },
    { name: 'Kabir Mehra', initial: 'KM', seat: 'D-22', expiry: 'Oct 27, 2023', daysLeft: '5d' },
  ]

  const consistencyStars = [
    { rank: 1, name: 'Rohit V.', days: 27, color: 'bg-primary' },
    { rank: 2, name: 'Meera J.', days: 22, color: 'bg-surface-container-high' },
    { rank: 3, name: 'Aman K.', days: 19, color: 'bg-surface-container-high' },
  ]

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar Updated Style */}
      <header className="w-full top-0 sticky z-50 bg-surface/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex justify-between items-center px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
            <h1 className="font-headline font-black text-lg text-primary tracking-tight">ReadingSpace</h1>
          </div>
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full border border-outline-variant overflow-hidden shadow-sm hover:scale-105 transition-transform">
               {/* Using initials as fallback image link isn't available */}
               <div className="w-full h-full bg-primary-fixed text-primary flex items-center justify-center font-bold text-xs uppercase">RA</div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-6 pb-32 space-y-8">
        
        {/* Top Section: Seat Occupancy Bento Card */}
        <section className="grid grid-cols-1 gap-6">
          <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-[0px_8px_24px_rgba(0,0,0,0.04)] flex flex-col justify-between overflow-hidden relative border border-outline-variant/10">
            <div className="z-10">
              <h2 className="font-headline text-[10px] font-black text-on-surface-variant uppercase tracking-[0.2em] mb-2 opacity-60">Live Occupancy</h2>
              <div className="flex items-baseline gap-2 mb-6">
                <span className="text-5xl font-black text-primary tracking-tighter italic">42</span>
                <span className="text-xl text-outline font-bold opacity-60">/ 50 Seats</span>
              </div>
              <div className="space-y-4 max-w-md">
                <div className="flex justify-between text-sm font-black italic">
                  <span className="text-primary truncate">Total Capacity Utilization</span>
                  <span className="text-secondary">84%</span>
                </div>
                <div className="w-full bg-surface-container-high h-4 rounded-full overflow-hidden shadow-inner">
                  <div className="bg-gradient-to-r from-primary to-primary-container h-full w-[84%] rounded-full shadow-lg"></div>
                </div>
                <p className="text-[11px] text-on-surface-variant font-bold flex items-center gap-2 opacity-70">
                  <Info size={14} className="text-outline" />
                  8 Seats currently available for walk-in scholars
                </p>
              </div>
            </div>
            {/* Abstract Decorative Icon */}
            <div className="absolute right-8 top-1/2 -translate-y-1/2 opacity-5 pointer-events-none">
              <span className="material-symbols-outlined text-[120px]">chair_alt</span>
            </div>
            <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-primary/5 rounded-full blur-3xl" />
          </div>
        </section>

        {/* Middle Section: Calendar Attendance UI */}
        <section className="bg-surface-container-low p-8 rounded-2xl border border-outline-variant/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <h2 className="font-headline text-3xl text-primary font-black italic tracking-tighter">Attendance Heatmap</h2>
              <p className="text-on-surface-variant text-[11px] uppercase font-bold tracking-widest opacity-60">Facility usage density for the current month</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="p-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-container-high transition-colors shadow-sm">
                <ChevronLeft size={20} className="text-primary" />
              </button>
              <h3 className="font-headline font-black text-primary text-lg italic px-4">November 2024</h3>
              <button className="p-2.5 rounded-full bg-surface-container-lowest border border-outline-variant/10 hover:bg-surface-container-high transition-colors shadow-sm">
                <ChevronRight size={20} className="text-primary" />
              </button>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest p-8 rounded-3xl shadow-sm border border-outline-variant/10">
            <div className="grid grid-cols-7 gap-4 mb-6">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
                <div key={d} className="text-center text-[10px] font-black text-outline uppercase tracking-[0.2em]">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-8 gap-x-4">
               {/* Simplified Calendar Grid for Demo */}
               {Array.from({ length: 30 }).map((_, i) => {
                  const day = i + 1;
                  let dotStyle = "w-10 h-10 rounded-full flex-center text-sm font-black transition-all hover:scale-110 shadow-sm ";
                  if (day < 5) dotStyle += "bg-primary/10 text-primary border border-primary/20";
                  else if (day < 15) dotStyle += "bg-secondary text-white shadow-lg shadow-secondary/20";
                  else if (day < 25) dotStyle += "bg-primary text-white shadow-lg shadow-primary/20";
                  else dotStyle += "text-on-surface hover:bg-surface-container-high";
                  
                  return (
                    <div key={i} className="aspect-square flex-center relative">
                       <div className={dotStyle}>{day}</div>
                    </div>
                  )
               })}
            </div>
          </div>
          
          <div className="mt-10 flex items-center justify-center gap-8">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary/20" />
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Low Utilization</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-secondary" />
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
              <span className="text-[10px] font-black text-outline uppercase tracking-widest">Peak Occupancy</span>
            </div>
          </div>
        </section>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Expiring Plans List */}
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-black text-primary italic tracking-tight">Expiring Plans</h3>
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-sm border border-outline-variant/10">
              <div className="divide-y divide-outline-variant/5">
                {expiringPlans.map((plan, i) => (
                  <div key={i} className="p-5 flex items-center justify-between hover:bg-surface-container-low transition-colors group cursor-pointer active:scale-[0.99]">
                    <div className="flex items-center gap-4">
                      <div className="w-11 h-11 rounded-2xl bg-surface-container-high flex-center font-black text-primary shadow-inner">
                        {plan.initial}
                      </div>
                      <div>
                        <p className="font-black text-primary text-[15px]">{plan.name}</p>
                        <p className="text-[10px] text-outline font-black uppercase tracking-widest font-mono opacity-60">Seat {plan.seat}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-black ${plan.daysLeft === '5d' ? 'text-secondary' : 'text-error'}`}>Expires in {plan.daysLeft}</p>
                      <p className="text-[10px] text-outline font-bold uppercase tracking-wider">{plan.expiry}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button className="w-full py-5 text-primary font-black text-[13px] uppercase tracking-widest bg-surface-container-low/50 hover:bg-surface-container-low transition-all flex items-center justify-center gap-2 group/all">
                View All Directory
                <ArrowRight size={14} className="group-hover/all:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Top Performers Podium (Consistency Stars) */}
          <div className="space-y-6">
            <h3 className="font-headline text-2xl font-black text-primary italic tracking-tight">Consistency Stars</h3>
            <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-sm border border-outline-variant/10 relative flex flex-col items-center justify-center min-h-[300px]">
              <div className="flex items-end justify-center gap-4 w-full max-w-[320px] mx-auto pb-4">
                
                {/* Rank 2 */}
                <div className="flex-1 flex flex-col items-center group">
                  <div className="w-12 h-12 rounded-full border-2 border-outline-variant/20 overflow-hidden mb-3 shadow-inner group-hover:scale-110 transition-transform">
                     <div className="w-full h-full bg-surface-container-high flex-center font-bold text-primary text-xs">MJ</div>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-t-xl h-16 flex flex-col items-center justify-center px-1 shadow-inner">
                    <span className="text-xl font-black text-on-surface-variant">2</span>
                    <p className="text-[10px] font-black text-primary truncate w-full text-center px-2">Meera J.</p>
                    <p className="text-[8px] text-outline font-black uppercase tracking-tighter opacity-70">22 Days</p>
                  </div>
                </div>

                {/* Rank 1 */}
                <div className="flex-1 flex flex-col items-center group">
                  <div className="w-16 h-16 rounded-full border-4 border-primary overflow-hidden mb-3 shadow-2xl relative group-hover:scale-105 transition-transform">
                     <div className="w-full h-full bg-primary flex-center font-black text-white text-lg">RV</div>
                     <div className="absolute -top-1 -right-1 bg-white text-primary rounded-full w-6 h-6 flex items-center justify-center border-2 border-primary shadow-md">
                        <span className="material-symbols-outlined text-xs fill-icon">workspace_premium</span>
                     </div>
                  </div>
                  <div className="w-full bg-primary rounded-t-2xl h-28 flex flex-col items-center justify-center px-1 shadow-2xl">
                    <span className="text-2xl font-black text-white italic">1</span>
                    <p className="text-[11px] font-black text-white truncate w-full text-center px-2">Rohit V.</p>
                    <p className="text-[9px] text-white/80 font-black uppercase tracking-widest">27 Days</p>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="flex-1 flex flex-col items-center group">
                  <div className="w-12 h-12 rounded-full border-2 border-outline-variant/20 overflow-hidden mb-3 shadow-inner group-hover:scale-110 transition-transform">
                     <div className="w-full h-full bg-surface-container-high flex-center font-bold text-primary text-xs">AK</div>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-t-xl h-12 flex flex-col items-center justify-center px-1 shadow-inner">
                    <span className="text-lg font-black text-on-surface-variant">3</span>
                    <p className="text-[10px] font-black text-primary truncate w-full text-center px-2">Aman K.</p>
                    <p className="text-[8px] text-outline font-black uppercase tracking-tighter opacity-70">19 Days</p>
                  </div>
                </div>
              </div>
              <div className="absolute top-4 right-6">
                 <span className="material-symbols-outlined text-primary/10 text-6xl">stars</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
