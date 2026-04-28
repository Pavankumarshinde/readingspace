"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { Play, Pause, RotateCcw, SkipForward, Clock, ChevronDown } from "lucide-react";

interface FocusSession {
  id: string;
  task_name: string | null;
  duration_minutes: number;
  mode: string;
  completed_at: string;
}

interface FocusTabProps {
  userId: string;
}

type Mode = "pomodoro" | "short" | "long";
const MODES: { key: Mode; label: string; emoji: string; secs: number }[] = [
  { key: "short", label: "Short Break", emoji: "⚡", secs: 10 * 60 },
  { key: "pomodoro", label: "Medium", emoji: "🎯", secs: 30 * 60 },
  { key: "long", label: "Long Break", emoji: "🔋", secs: 60 * 60 },
];

const RING_R = 36;
const RING_CIRC = 2 * Math.PI * RING_R;

export default function FocusTab({ userId }: FocusTabProps) {
  const supabase = createClient();
  const [mode, setMode] = useState<Mode>("short");
  const [totalSecs, setTotalSecs] = useState(10 * 60);
  const [secsLeft, setSecsLeft] = useState(10 * 60);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const [running, setRunning] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [sessions, setSessions] = useState<FocusSession[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [userId]);

  const fetchSessions = async () => {
    const { data } = await supabase
      .from("focus_sessions")
      .select("*")
      .eq("user_id", userId)
      .order("completed_at", { ascending: false })
      .limit(50);
    if (data) setSessions(data as FocusSession[]);
  };

  const tick = useCallback(() => {
    setSecsLeft((prev) => {
      if (prev <= 1) {
        handleComplete();
        return 0;
      }
      return prev - 1;
    });
  }, [mode, taskName, totalSecs]);

  const handleComplete = async () => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    const modeData = MODES.find((m) => m.key === mode)!;
    const { data } = await supabase
      .from("focus_sessions")
      .insert({
        user_id: userId,
        task_name: taskName || null,
        duration_minutes: Math.round(modeData.secs / 60),
        mode,
      })
      .select()
      .single();
    if (data) setSessions((prev) => [data as FocusSession, ...prev]);
  };

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(tick, 1000);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, tick]);

  const setModeAndReset = (m: Mode) => {
    setMode(m);
    const secs = MODES.find((x) => x.key === m)!.secs;
    setTotalSecs(secs);
    setSecsLeft(secs);
    setRunning(false);
  };

  const reset = () => {
    setSecsLeft(totalSecs);
    setRunning(false);
  };

  const skip = () => {
    setSecsLeft(0);
    setRunning(false);
    handleComplete();
  };

  const mins = Math.floor(secsLeft / 60)
    .toString()
    .padStart(2, "0");
  const secs = (secsLeft % 60).toString().padStart(2, "0");
  const progress = totalSecs > 0 ? secsLeft / totalSecs : 0;
  const dashOffset = RING_CIRC * (1 - progress);

  return (
    <div className="w-full">
      {/* Sticky Top Section */}
      <div className="sticky top-0 z-10 bg-surface pb-4 pt-1 space-y-4">
        {/* Header & Mode Selector */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline tracking-tight text-on-surface text-base font-medium">
              Focus
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">
              Focus Timer
            </p>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowModeDropdown(!showModeDropdown)}
              className="flex items-center gap-2 px-3 py-2 bg-surface-container-lowest border border-outline-variant/15 rounded-xl text-[10px] font-black uppercase tracking-widest text-on-surface-variant hover:bg-surface-container/50 transition-all"
            >
              <span className="text-sm">{MODES.find((m) => m.key === mode)?.emoji}</span>
              {MODES.find((m) => m.key === mode)?.label}
              <ChevronDown size={14} className="opacity-50" />
            </button>
            
            {showModeDropdown && (
              <>
                <div 
                  className="fixed inset-0 z-40"
                  onClick={() => setShowModeDropdown(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in slide-in-from-top-2">
                  {MODES.map((m) => (
                    <button
                      key={m.key}
                      onClick={() => {
                        setModeAndReset(m.key);
                        setShowModeDropdown(false);
                      }}
                      className={`w-full flex items-center justify-start gap-3 px-3 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${
                        mode === m.key
                          ? "bg-primary text-white shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container"
                      }`}
                    >
                      <span className="text-sm">{m.emoji}</span>
                      {m.label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Timer Card - Simple & Minimalist */}
        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl p-4 transition-all flex flex-col items-center gap-4">
          <div className="flex items-center justify-center gap-8 w-full">
            {/* Controls left */}
            <button
              onClick={reset}
              className="p-2 text-on-surface/30 hover:text-on-surface hover:bg-surface-container rounded-lg transition-all"
            >
              <RotateCcw size={16} />
            </button>

            {/* Time with Circular Ring */}
            <div className="relative flex items-center justify-center w-20 h-20">
              <svg width="80" height="80" className="rotate-[-90deg] absolute inset-0">
                <circle
                  cx="40"
                  cy="40"
                  r={RING_R}
                  fill="none"
                  stroke="var(--color-surface-container)"
                  strokeWidth="4"
                />
                <circle
                  cx="40"
                  cy="40"
                  r={RING_R}
                  fill="none"
                  stroke="var(--color-primary)"
                  strokeWidth="4"
                  strokeLinecap="round"
                  strokeDasharray={RING_CIRC}
                  strokeDashoffset={dashOffset}
                  style={{
                    transition: running ? "stroke-dashoffset 1s linear" : "none",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-headline text-2xl leading-none font-bold text-on-surface tabular-nums tracking-tighter">
                  {mins}:{secs}
                </span>
              </div>
            </div>

            {/* Controls right */}
            <button
              onClick={skip}
              className="p-2 text-on-surface/30 hover:text-on-surface hover:bg-surface-container rounded-lg transition-all"
            >
              <SkipForward size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2 w-full">
            <button
              onClick={() => setRunning(!running)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${
                running
                  ? "bg-surface-container-high text-on-surface"
                  : "bg-primary text-white shadow-sm shadow-primary/20"
              }`}
            >
              {running ? (
                <Pause size={16} className="fill-current" />
              ) : (
                <Play size={16} className="ml-0.5 fill-current" />
              )}
            </button>
            <input
              type="text"
              placeholder="What are you focusing on?"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              className="flex-1 bg-surface-container/50 border-none rounded-xl px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-on-surface outline-none focus:ring-1 focus:ring-primary/20 placeholder:text-on-surface/30 placeholder:tracking-widest"
            />
          </div>
        </div>
      </div>

      {/* History */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.35em] text-on-surface/30 mb-3">
          Session History
        </p>

        {sessions.length === 0 ? (
          <div className="py-12 text-center text-on-surface/20">
            <p className="text-xs font-bold uppercase tracking-widest">
              Ready for Focus
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div
                key={s.id}
                className="w-full flex items-center justify-between bg-surface-container-lowest border border-outline-variant/10 rounded-2xl px-4 py-3.5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {MODES.find((m) => m.key === s.mode)?.emoji ?? "🍅"}
                  </span>
                  <div>
                    <h5 className="text-[13px] text-on-surface-variant font-medium leading-tight">
                      {s.task_name || "Focus Session"}
                    </h5>
                    <div className="flex items-center gap-1.5 mt-1">
                      <Clock size={9} className="text-on-surface/25" />
                      <span className="text-[9px] font-black uppercase tracking-widest text-on-surface/30">
                        {format(new Date(s.completed_at), "MMM d · h:mm a")}
                      </span>
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-black uppercase tracking-widest text-primary/50">
                  {s.duration_minutes} min
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
