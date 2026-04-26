'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'

// The two texts that type out — one for students, one for managers
const TYPING_TEXTS = [
  "ReadingSpace helps students book seats, track attendance, manage notes, tasks, habits and stay focused — all in one place.",
  "For managers, ReadingSpace makes it easy to run your study space — track students, manage rooms, mark attendance and collect payments effortlessly.",
]

const TYPING_SPEED = 28   // ms per character
const PAUSE_AFTER  = 1800 // ms pause after each text before switching
const ERASE_SPEED  = 12   // ms per character erase

export default function LandingClient() {
  // Phase: 'splash' → typing intro → 'home' landing
  const [phase, setPhase] = useState<'splash' | 'home'>('splash')
  const [displayed, setDisplayed] = useState('')
  const [textIdx, setTextIdx]     = useState(0)
  const [charIdx, setCharIdx]     = useState(0)
  const [erasing, setErasing]     = useState(false)
  const [progress, setProgress]   = useState(0)

  // Typing / erasing engine
  useEffect(() => {
    if (phase !== 'splash') return

    const current = TYPING_TEXTS[textIdx]

    if (!erasing) {
      if (charIdx < current.length) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx + 1))
          setCharIdx(c => c + 1)
          // Update progress: first text 0→50, second 50→100
          const base = textIdx === 0 ? 0 : 50
          setProgress(base + ((charIdx + 1) / current.length) * 50)
        }, TYPING_SPEED)
        return () => clearTimeout(t)
      } else {
        // Finished typing — pause, then erase (if first text) or go home
        if (textIdx === 0) {
          const t = setTimeout(() => setErasing(true), PAUSE_AFTER)
          return () => clearTimeout(t)
        } else {
          // Done with both — transition to home
          const t = setTimeout(() => setPhase('home'), PAUSE_AFTER)
          return () => clearTimeout(t)
        }
      }
    } else {
      // Erasing
      if (charIdx > 0) {
        const t = setTimeout(() => {
          setDisplayed(current.slice(0, charIdx - 1))
          setCharIdx(c => c - 1)
        }, ERASE_SPEED)
        return () => clearTimeout(t)
      } else {
        // Switch to second text
        setErasing(false)
        setTextIdx(1)
        setCharIdx(0)
        setDisplayed('')
      }
    }
  }, [phase, charIdx, erasing, textIdx])

  /* ── Splash / Typing Screen ─────────────────────────────────── */
  if (phase === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-8 bg-surface font-body relative overflow-hidden">
        {/* Subtle gradient blobs */}
        <div className="absolute -top-[15%] -right-[15%] w-[55vw] h-[55vw] rounded-full bg-primary/[0.07] blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-[15%] -left-[15%] w-[50vw] h-[50vw] rounded-full bg-secondary/[0.04] blur-[90px] pointer-events-none" />

        <div className="w-full max-w-sm flex flex-col items-start z-10">
          {/* Big brand name */}
          <h1 className="font-headline text-5xl font-extrabold text-primary tracking-tight mb-8 leading-tight">
            Reading<br />Space
          </h1>

          {/* Typing text */}
          <p className="text-[15px] leading-relaxed font-body text-on-surface font-medium min-h-[120px]">
            {displayed}
            <span className="inline-block w-[2px] h-[1em] bg-primary ml-0.5 align-middle animate-[blink_0.9s_step-end_infinite]" />
          </p>

          {/* Progress bar */}
          <div className="mt-10 w-full h-[3px] bg-outline-variant/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <style jsx>{`
          @keyframes blink {
            0%, 100% { opacity: 1; }
            50% { opacity: 0; }
          }
        `}</style>
      </div>
    )
  }

  /* ── Home / CTA Screen ──────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface font-body relative overflow-hidden animate-in fade-in duration-500">
      {/* Background blobs */}
      <div className="absolute -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.08] blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-secondary/[0.05] blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm flex flex-col items-center text-center z-10">

        {/* App Icon */}
        <div className="w-20 h-20 rounded-[1.8rem] bg-primary flex items-center justify-center mb-7 shadow-2xl shadow-primary/30">
          <BookOpen size={38} strokeWidth={1.5} className="text-white" />
        </div>

        {/* Headline */}
        <h1 className="font-headline text-[2.75rem] font-extrabold text-on-surface leading-[1.1] tracking-tight mb-4">
          Your Reading<br />Space
        </h1>

        {/* Subtitle */}
        <p className="text-[14px] text-on-surface-variant/70 font-medium leading-relaxed mb-10 max-w-[300px]">
          The smarter way to study — book seats, track habits, stay focused, and never miss a session.
        </p>

        {/* CTA Buttons */}
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full bg-primary text-white py-4 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 shadow-xl shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Get Started
            <ArrowRight size={17} className="opacity-80" />
          </Link>
          <Link
            href="/login"
            className="w-full bg-surface-container-lowest border border-outline-variant/20 text-on-surface py-4 rounded-2xl text-[14px] font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
          >
            Login
          </Link>
        </div>

        {/* Footer note */}
        <p className="mt-10 text-[10px] text-on-surface-variant/30 font-bold uppercase tracking-widest">
          ReadingSpace © 2025
        </p>
      </div>
    </div>
  )
}
