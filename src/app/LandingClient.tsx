'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { BookOpen } from 'lucide-react'

const STUDENT_TEXT = "Students book seats, track attendance, manage notes, habits and stay focused — all in one place."
const MANAGER_TEXT = "Managers handle rooms, members, payments and attendance — from a single dashboard."

const SPEED = 30 // ms per char

export default function LandingClient() {
  const [phase, setPhase] = useState<'splash' | 'home'>('splash')

  // Two independent typewriters
  const [sText, setSText] = useState('')
  const [mText, setMText] = useState('')
  const [sIdx, setSIdx] = useState(0)
  const [mIdx, setMIdx] = useState(0)

  const sProgress = STUDENT_TEXT.length > 0 ? sIdx / STUDENT_TEXT.length : 0
  const mProgress = MANAGER_TEXT.length > 0 ? mIdx / MANAGER_TEXT.length : 0
  const progress = Math.round(((sProgress + mProgress) / 2) * 100)

  // Student typewriter
  useEffect(() => {
    if (phase !== 'splash' || sIdx >= STUDENT_TEXT.length) return
    const t = setTimeout(() => {
      setSText(STUDENT_TEXT.slice(0, sIdx + 1))
      setSIdx(i => i + 1)
    }, SPEED)
    return () => clearTimeout(t)
  }, [phase, sIdx])

  // Manager typewriter — starts ~0.3s after student
  useEffect(() => {
    if (phase !== 'splash' || mIdx >= MANAGER_TEXT.length) return
    const delay = mIdx === 0 ? 300 : SPEED + 4 // slightly slower than student
    const t = setTimeout(() => {
      setMText(MANAGER_TEXT.slice(0, mIdx + 1))
      setMIdx(i => i + 1)
    }, delay)
    return () => clearTimeout(t)
  }, [phase, mIdx])

  // Transition when both done
  useEffect(() => {
    if (sIdx >= STUDENT_TEXT.length && mIdx >= MANAGER_TEXT.length) {
      const t = setTimeout(() => setPhase('home'), 1400)
      return () => clearTimeout(t)
    }
  }, [sIdx, mIdx])

  /* ── Splash ─────────────────────────────────────────── */
  if (phase === 'splash') {
    return (
      <div className="min-h-screen flex flex-col items-start justify-center px-8 bg-surface font-body">
        {/* Big brand name */}
        <h1 className="font-headline text-5xl font-extrabold text-primary italic tracking-tight mb-8 leading-tight">
          ReadingSpace
        </h1>

        {/* Two typing areas */}
        <div className="w-full space-y-5 mb-10">
          {/* Student */}
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/40 mb-1">
              For Students
            </p>
            <p className="text-[15px] leading-relaxed font-body text-on-surface font-medium min-h-[60px]">
              {sText}
              {sIdx < STUDENT_TEXT.length && (
                <span className="inline-block w-[2px] h-[0.9em] bg-primary ml-[1px] align-middle animate-[blink_0.9s_step-end_infinite]" />
              )}
            </p>
          </div>

          {/* Manager — only starts rendering after a brief delay */}
          {mIdx > 0 && (
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.25em] text-tertiary/50 mb-1">
                For Managers
              </p>
              <p className="text-[15px] leading-relaxed font-body text-on-surface font-medium min-h-[48px]">
                {mText}
                {mIdx < MANAGER_TEXT.length && (
                  <span className="inline-block w-[2px] h-[0.9em] bg-tertiary ml-[1px] align-middle animate-[blink_0.9s_step-end_infinite]" />
                )}
              </p>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-[3px] bg-outline-variant/15 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-200 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>

        <style jsx>{`
          @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
        `}</style>
      </div>
    )
  }

  /* ── Auth Home ───────────────────────────────────────── */
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-surface font-body animate-in fade-in duration-500">
      {/* Subtle blob */}
      <div className="fixed -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.07] blur-[120px] pointer-events-none" />

      <div className="w-full max-w-xs flex flex-col items-center text-center z-10">
        {/* Icon */}
        <div className="w-[68px] h-[68px] rounded-[1.6rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/25 mb-5">
          <BookOpen size={34} strokeWidth={1.4} className="text-white" />
        </div>

        {/* Name */}
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Reading<span className="text-primary">Space</span>
        </h1>

        {/* One-liner */}
        <p className="text-[13px] text-on-surface-variant/60 font-medium mb-10">
          Your premium study environment.
        </p>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full bg-primary text-white py-[14px] rounded-2xl text-[13px] font-bold shadow-xl shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="w-full border border-outline-variant/25 bg-surface-container-lowest text-on-surface py-[14px] rounded-2xl text-[13px] font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
          >
            Login
          </Link>
        </div>

        <p className="mt-10 text-[9px] text-on-surface-variant/25 font-bold uppercase tracking-widest">
          ReadingSpace © 2025
        </p>
      </div>
    </div>
  )
}
