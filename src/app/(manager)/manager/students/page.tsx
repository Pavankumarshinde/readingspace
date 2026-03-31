'use client'

import { useState } from 'react'
import Link from 'next/link'
import Avatar from '@/components/ui/Avatar'

export default function ManagerStudentDirectory() {
  const [searchTerm, setSearchTerm] = useState('')

  const students = [
    { 
      id: '104', 
      name: 'Arjun Reddy', 
      email: 'a.reddy@email.com', 
      phone: '+91 98765 43210', 
      status: 'paid', 
      gender: 'Male', 
      age: 22, 
      warning: 'Expiring in 3 days',
      start: 'Oct 01, 2023',
      expiry: 'Oct 31, 2023',
      note: 'Requested late check-out next week for exam preparation. Approved for Mon-Wed.',
      color: 'bg-primary-fixed text-primary'
    },
    { 
      id: '109', 
      name: 'Priya Mehta', 
      email: 'p.mehta@university.edu', 
      phone: '+91 99887 76655', 
      status: 'paid', 
      gender: 'Female', 
      age: 20, 
      start: 'Sep 15, 2023',
      expiry: 'Dec 15, 2023',
      note: 'No special requests logged.',
      color: 'bg-secondary-fixed-dim text-on-secondary-fixed-variant'
    },
    { 
      id: '112', 
      name: 'Siddharth Kapoor', 
      email: 'sid.kapoor@gmail.com', 
      phone: '+91 97766 55443', 
      status: 'due', 
      gender: 'Male', 
      age: 24, 
      start: 'Oct 20, 2023',
      expiry: 'Nov 20, 2023',
      note: 'Payment pending for the current cycle. Reminder sent on Oct 22.',
      color: 'bg-surface-container-highest text-primary'
    },
    { 
      id: '098', 
      name: 'Lisa Anderson', 
      email: 'lisa.a@outlook.com', 
      phone: '+91 96655 44332', 
      status: 'overdue', 
      gender: 'Female', 
      age: 21, 
      start: 'Sep 01, 2023',
      expiry: 'Oct 01, 2023',
      note: 'Access card suspended until payment is cleared.',
      color: 'bg-error-container text-on-error-container'
    }
  ]

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-secondary-fixed text-on-secondary-fixed'
      case 'due': return 'bg-tertiary-fixed-dim text-on-tertiary-fixed'
      case 'overdue': return 'bg-error text-on-error'
      default: return 'bg-surface-container text-on-surface-variant'
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface">
      {/* TopAppBar */}
      <header className="w-full top-0 sticky z-50 bg-surface/80 backdrop-blur-md flex justify-between items-center px-6 py-4 border-b border-outline-variant/10">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>
            menu_book
          </span>
          <h1 className="text-xl font-bold text-primary font-headline tracking-tighter">ReadingSpace</h1>
        </div>
        <div className="hidden md:flex items-center gap-8 mr-8">
           <span className="text-primary font-bold font-headline cursor-pointer">Students</span>
           <Link href="/manager/dashboard" className="text-on-surface-variant hover:text-primary font-semibold font-headline transition-colors">Dashboard</Link>
           <Link href="/manager/profile" className="text-on-surface-variant hover:text-primary font-semibold font-headline transition-colors">Profile</Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-8 pb-32">
        <section className="mb-8">
          <h2 className="font-headline font-extrabold text-primary tracking-tighter text-4xl md:text-5xl mb-2 italic">Student Directory</h2>
          <p className="text-on-surface-variant font-body max-w-2xl leading-relaxed opacity-80 uppercase tracking-widest text-[11px] font-bold">Manage active memberships, track subscription health, and oversee space utilization.</p>
        </section>

        <div className="flex flex-col gap-6 mb-8">
          <div className="flex items-center gap-2 md:gap-4">
            <div className="relative flex-1 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline group-focus-within:text-primary transition-colors">search</span>
              <input 
                className="w-full bg-surface-container-low border-none rounded-xl py-3 pl-12 pr-4 text-sm font-semibold focus:ring-2 focus:ring-primary/20 placeholder:text-on-surface-variant/60" 
                placeholder="Search students..." 
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="flex-center p-3 bg-surface-container-low border border-outline-variant/10 rounded-xl text-outline hover:bg-surface-container-high transition-colors">
              <span className="material-symbols-outlined">filter_list</span>
            </button>
            <Link href="/manager/students/add">
               <button className="btn-primary px-6 h-[44px] !text-sm !shadow-none">
                 <span className="material-symbols-outlined text-xl">person_add</span>
                 <span className="hidden sm:inline">Add Student</span>
               </button>
            </Link>
          </div>

          <div className="flex p-1 bg-surface-container-low rounded-xl w-full sm:w-fit border border-outline-variant/10">
            <button className="flex-1 sm:flex-none px-10 py-2.5 rounded-lg bg-surface-container-lowest text-primary font-bold shadow-sm transition-all duration-200">
                Active
            </button>
            <button className="flex-1 sm:flex-none px-10 py-2.5 rounded-lg text-on-surface-variant font-semibold hover:bg-surface-container-highest/50 transition-all duration-200">
                Expired
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {students.map((student) => (
            <div key={student.id} className="relative bg-surface-container-lowest rounded-2xl p-6 transition-all duration-300 hover:translate-y-[-2px] border border-outline-variant/5 shadow-sm">
              <div className="absolute top-6 right-6">
                <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] ${getStatusStyle(student.status)}`}>
                   {student.status}
                </span>
              </div>
              
              <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
                <div className="flex gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex-center font-bold text-lg shadow-inner ${student.color}`}>
                     {student.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div className="flex flex-col justify-center">
                    <h3 className="text-xl font-black text-primary font-headline italic leading-none">{student.name}</h3>
                    <div className="flex items-center gap-3 mt-2">
                       <span className="font-mono text-[10px] font-bold text-on-surface-variant bg-surface-container-low px-2 py-0.5 rounded shadow-sm">ID: {student.id}</span>
                       <span className="text-[10px] text-on-surface-variant font-black uppercase tracking-widest opacity-60">{student.age}, {student.gender}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                {student.warning && (
                  <div className="flex flex-col gap-3.5 px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed text-[10px] font-bold uppercase tracking-widest rounded-full w-fit mb-4 border border-tertiary-fixed-dim/20">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm fill-icon">warning</span>
                      {student.warning}
                    </div>
                  </div>
                )}
                
                <div className="flex flex-col gap-2 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <div className="flex flex-col gap-2 border-b border-outline-variant/10 pb-3 mb-1">
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">mail</span>
                      <p className="text-sm font-bold text-primary truncate">{student.email}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-lg">call</span>
                      <p className="text-sm font-bold text-primary">{student.phone}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-on-surface-variant uppercase font-black tracking-[0.2em] mb-2 opacity-60">Subscription Period</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Start Date</p>
                        <p className="text-sm font-black text-primary italic">{student.start}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-on-surface-variant font-bold uppercase tracking-widest">Expiry Date</p>
                        <p className="text-sm font-black text-primary italic">{student.expiry}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className={`flex gap-3 items-start p-3 bg-white/50 border-l-4 rounded-r-xl ${student.status === 'overdue' ? 'border-error' : 'border-primary'}`}>
                <span className={`material-symbols-outlined text-lg ${student.status === 'overdue' ? 'text-error' : 'text-primary'}`}>sticky_note_2</span>
                <div className="flex-1">
                  <p className={`text-[9px] uppercase font-black tracking-[0.2em] mb-0.5 ${student.status === 'overdue' ? 'text-error' : 'text-primary'}`}>Manager Note</p>
                  <p className={`text-xs leading-relaxed font-semibold ${student.status === 'overdue' ? 'text-error' : 'text-on-surface-variant'}`}>{student.note}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Floating Action Button */}
      <Link href="/manager/students/add">
        <button className="fixed bottom-32 right-6 md:bottom-8 md:right-8 w-14 h-14 bg-primary text-on-primary rounded-full shadow-2xl flex items-center justify-center hover:scale-105 active:scale-95 transition-all z-40 border-4 border-white">
          <span className="material-symbols-outlined text-3xl">add</span>
        </button>
      </Link>
    </div>
  )
}
