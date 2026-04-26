'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  BookOpen, ArrowRight, GraduationCap, Building2,
  CalendarCheck, BookMarked, Target, QrCode,
  Users, BarChart3, Banknote, ShieldCheck
} from 'lucide-react'

// Tagline typewriter — short rotating phrases
const TAGLINES = [
  'Your premium study companion.',
  'Track habits. Stay focused.',
  'Never miss a session.',
  'Study smarter every day.',
]

export default function LandingClient() {
  const [tagIdx, setTagIdx] = useState(0)
  const [displayed, setDisplayed] = useState('')
  const [charIdx, setCharIdx] = useState(0)
  const [erasing, setErasing] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => { setVisible(true) }, [])

  // Typewriter for the rotating tagline
  useEffect(() => {
    const current = TAGLINES[tagIdx]
    if (!erasing) {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
        }, 40)
        return () => clearTimeout(t)
      } else {
        const t = setTimeout(() => setErasing(true), 2200)
        return () => clearTimeout(t)
      }
    } else {
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        }, 18)
        return () => clearTimeout(t)
      } else {
        setErasing(false)
        setTagIdx(i => (i + 1) % TAGLINES.length)
      }
    }
  }, [charIdx, erasing, tagIdx])

  return (
    <div
      className={`min-h-screen bg-surface font-body flex flex-col transition-opacity duration-700 ${visible ? 'opacity-100' : 'opacity-0'}`}
    >
      {/* ── Background blobs ── */}
      <div className="fixed -top-[20%] -right-[15%] w-[70vw] h-[70vw] rounded-full bg-primary/[0.06] blur-[130px] pointer-events-none z-0" />
      <div className="fixed -bottom-[20%] -left-[15%] w-[60vw] h-[60vw] rounded-full bg-secondary/[0.04] blur-[120px] pointer-events-none z-0" />

      {/* ── Hero ── */}
      <header className="relative z-10 flex flex-col items-center pt-16 pb-10 px-6 text-center">

        {/* App icon */}
        <div className="w-[72px] h-[72px] rounded-[1.7rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/30 mb-6">
          <BookOpen size={36} strokeWidth={1.4} className="text-white" />
        </div>

        {/* Brand */}
        <h1 className="font-headline text-[2.6rem] font-extrabold text-on-surface leading-[1.08] tracking-tight">
          Reading<span className="text-primary">Space</span>
        </h1>

        {/* Rotating tagline */}
        <p className="mt-3 text-[14px] text-on-surface-variant/70 font-medium h-6">
          {displayed}
          <span className="inline-block w-[1.5px] h-[0.9em] bg-primary ml-[1px] align-middle animate-[blink_0.9s_step-end_infinite]" />
        </p>

        {/* CTA buttons */}
        <div className="mt-8 w-full max-w-xs flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full bg-primary text-white py-[14px] rounded-2xl text-[13px] font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/25 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Create Account <ArrowRight size={16} className="opacity-80" />
          </Link>
          <Link
            href="/login"
            className="w-full border border-outline-variant/25 bg-surface-container-lowest text-on-surface py-[14px] rounded-2xl text-[13px] font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
          >
            Login
          </Link>
        </div>
      </header>

      {/* ── About section ── */}
      <main className="relative z-10 flex flex-col items-center gap-5 px-5 pb-16 max-w-lg mx-auto w-full">

        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface/30 mb-1">
          Built for everyone
        </p>

        {/* Student card */}
        <div className="w-full bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-lg shadow-primary/5 overflow-hidden">

          {/* Card header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-outline-variant/8">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <GraduationCap size={18} className="text-primary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-primary/70">For Students</p>
              <h2 className="text-[15px] font-headline font-bold text-on-surface leading-tight">Your study, organised</h2>
            </div>
          </div>

          {/* Description */}
          <p className="px-5 pt-4 pb-4 text-[13px] text-on-surface-variant leading-relaxed">
            Book your seat, scan in with QR, and let ReadingSpace handle the rest. Track what you study, build daily habits, and stay on top of deadlines — all from one app.
          </p>

          {/* Feature pills */}
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {[
              { icon: <QrCode size={13} />, label: 'QR Check-in' },
              { icon: <Target size={13} />, label: 'Habit Tracker' },
              { icon: <BookMarked size={13} />, label: 'Notes & Diary' },
              { icon: <CalendarCheck size={13} />, label: 'Tasks & Calendar' },
            ].map(f => (
              <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary rounded-xl text-[11px] font-bold border border-primary/10">
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Divider with "and" */}
        <div className="flex items-center gap-3 w-full">
          <div className="flex-1 h-px bg-outline-variant/15" />
          <span className="text-[10px] font-black uppercase tracking-widest text-on-surface/20">and</span>
          <div className="flex-1 h-px bg-outline-variant/15" />
        </div>

        {/* Manager card */}
        <div className="w-full bg-surface-container-lowest rounded-3xl border border-outline-variant/10 shadow-lg shadow-secondary/5 overflow-hidden">

          {/* Card header */}
          <div className="flex items-center gap-3 px-5 pt-5 pb-4 border-b border-outline-variant/8">
            <div className="w-9 h-9 rounded-xl bg-tertiary/10 flex items-center justify-center shrink-0">
              <Building2 size={18} className="text-tertiary" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.25em] text-tertiary/70">For Managers</p>
              <h2 className="text-[15px] font-headline font-bold text-on-surface leading-tight">Run your space effortlessly</h2>
            </div>
          </div>

          {/* Description */}
          <p className="px-5 pt-4 pb-4 text-[13px] text-on-surface-variant leading-relaxed">
            Manage rooms, seats, and members from a single dashboard. Track attendance in real time, handle subscriptions, and get full visibility into how your reading space runs.
          </p>

          {/* Feature pills */}
          <div className="px-5 pb-5 flex flex-wrap gap-2">
            {[
              { icon: <Users size={13} />, label: 'Student Management' },
              { icon: <BarChart3 size={13} />, label: 'Attendance Analytics' },
              { icon: <Banknote size={13} />, label: 'Payment Tracking' },
              { icon: <ShieldCheck size={13} />, label: 'Room Access Control' },
            ].map(f => (
              <span key={f.label} className="flex items-center gap-1.5 px-3 py-1.5 bg-tertiary/5 text-tertiary rounded-xl text-[11px] font-bold border border-tertiary/10">
                {f.icon} {f.label}
              </span>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-2 text-[9px] text-on-surface-variant/25 font-bold uppercase tracking-widest text-center">
          ReadingSpace © 2025 &nbsp;·&nbsp; Premium Study Environment
        </p>
      </main>

      <style jsx>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}
