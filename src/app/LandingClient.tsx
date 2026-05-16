"use client";

import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function LandingClient() {
  return (
    <div className="page-shell items-center justify-center px-6 bg-surface font-body animate-in fade-in duration-500">
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
  );
}
