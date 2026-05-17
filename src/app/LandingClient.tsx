"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function LandingClient() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-surface font-body relative overflow-hidden py-12 px-6">
      {/* Subtle background blobs */}
      <div className="fixed -top-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-primary/[0.08] blur-[120px] pointer-events-none z-0" />
      <div className="fixed -bottom-[20%] -left-[10%] w-[50vw] h-[50vw] rounded-full bg-secondary/[0.05] blur-[100px] pointer-events-none z-0" />

      <div className="w-full max-w-md flex flex-col items-center text-center z-10 animate-in fade-in duration-500">
        {/* Icon */}
        <div className="w-[68px] h-[68px] rounded-[1.6rem] bg-primary flex items-center justify-center shadow-2xl shadow-primary/25 mb-5">
          <BookOpen size={34} strokeWidth={1.4} className="text-white" />
        </div>

        {/* Name */}
        <h1 className="font-headline text-4xl font-extrabold text-on-surface tracking-tight mb-2">
          Reading<span className="text-primary">Space</span>
        </h1>

        <p className="text-sm font-bold uppercase tracking-[0.2em] text-on-surface-variant/60 mb-8">
          Premium Study Environment
        </p>

        {/* Intro Cards */}
        <div className="w-full space-y-4 mb-10 text-left">
          <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-primary/60 mb-2">
              For Students
            </p>
            <p className="text-[14px] leading-relaxed font-medium text-on-surface/80">
              Students can join a reading space, mark and track attendance, manage notes, habits and stay focused — all in one place.
            </p>
          </div>

          <div className="bg-surface-container-low/40 p-5 rounded-2xl border border-outline-variant/10 backdrop-blur-sm">
            <p className="text-[11px] font-black uppercase tracking-[0.25em] text-tertiary/60 mb-2">
              For Managers
            </p>
            <p className="text-[14px] leading-relaxed font-medium text-on-surface/80">
              Managers handle rooms, members, payments and attendance — from a single dashboard.
            </p>
          </div>
        </div>

        {/* CTAs */}
        <div className="w-full flex flex-col gap-3">
          <Link
            href="/signup"
            className="w-full bg-primary text-white py-[14px] rounded-2xl text-[14px] font-bold shadow-xl shadow-primary/20 hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Create Account
          </Link>
          <Link
            href="/login"
            className="w-full border border-outline-variant/25 bg-surface-container-lowest text-on-surface py-[14px] rounded-2xl text-[14px] font-bold hover:bg-surface-container-low active:scale-[0.98] transition-all"
          >
            Login
          </Link>
        </div>

        <p className="mt-12 text-[10px] text-on-surface-variant/30 font-bold tracking-widest uppercase">
          ReadingSpace © 2025
        </p>
      </div>
    </div>
  );
}
