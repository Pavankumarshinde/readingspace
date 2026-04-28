"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  format,
  subDays,
  isSameDay,
  parseISO,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  startOfDay,
  isBefore,
} from "date-fns";
import {
  Plus,
  Minus,
  RotateCcw,
  Archive,
  Trash2,
  Settings2,
  X,
  CheckCircle2,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";

interface Habit {
  id: string;
  name: string;
  icon: string;
  is_archived: boolean;
  habit_type: "checklist" | "numeric";
  target_value: number;
  unit: string;
  frequency_type: "daily" | "specific_days";
  frequency_days: number[];
  color: string;
  created_at: string;
}

interface HabitLog {
  id: string;
  habit_id: string;
  log_date: string;
  value: number;
}

interface HabitsTabProps {
  userId: string;
}

const EMOJI_OPTIONS = [
  "⭐",
  "📚",
  "💪",
  "🏃",
  "💧",
  "🧘",
  "🎯",
  "🎨",
  "🎵",
  "🍎",
  "😴",
  "🌿",
  "✍️",
  "🧠",
  "🌞",
];
const COLORS = [
  "#9B4000",
  "#00609a",
  "#16a34a",
  "#9333ea",
  "#dc2626",
  "#d97706",
  "#0891b2",
];
const DAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function getLast8Days(): Date[] {
  return Array.from({ length: 8 }, (_, i) => subDays(new Date(), 7 - i));
}

export default function HabitsTab({ userId }: HabitsTabProps) {
  const supabase = createClient();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);

  // Modal & Numeric Adjustment state
  const [showModal, setShowModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [adjustingLog, setAdjustingLog] = useState<{
    habit: Habit;
    day: Date;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    icon: "⭐",
    type: "checklist" as "checklist" | "numeric",
    target: 1,
    unit: "times",
    freqType: "daily" as "daily" | "specific_days",
    freqDays: [0, 1, 2, 3, 4, 5, 6],
    color: "#9B4000",
  });

  const days = getLast8Days();
  const today = days[days.length - 1];
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const monthDays = eachDayOfInterval({ start: monthStart, end: monthEnd });

  useEffect(() => {
    fetchAll();
  }, [userId]);

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: hData }, { data: lData }] = await Promise.all([
      supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .order("created_at"),
      supabase
        .from("habit_logs")
        .select("*")
        .eq("user_id", userId)
        .gte("log_date", format(startOfMonth(new Date()), "yyyy-MM-dd"))
        .lte("log_date", format(endOfMonth(new Date()), "yyyy-MM-dd")),
    ]);
    if (hData) setHabits(hData as Habit[]);
    if (lData) setLogs(lData as HabitLog[]);
    setLoading(false);
  };

  // --- Logic Helpers ---
  const activeHabits = habits.filter((h) => !h.is_archived);
  const archivedHabits = habits.filter((h) => h.is_archived);
  const currentHabits = showArchived ? archivedHabits : activeHabits;

  const getLogForDay = (habitId: string, day: Date) =>
    logs.find(
      (l) => l.habit_id === habitId && isSameDay(parseISO(l.log_date), day),
    );

  const isHabitActiveOn = (habit: Habit, day: Date) => {
    if (habit.frequency_type === "daily") return true;
    return habit.frequency_days.includes(day.getDay());
  };

  const logHabit = async (habit: Habit, day: Date, valueChange: number) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const existing = getLogForDay(habit.id, day);

    if (existing) {
      const newValue = Math.max(0, existing.value + valueChange);
      if (newValue === 0) {
        await supabase.from("habit_logs").delete().eq("id", existing.id);
        setLogs(logs.filter((l) => l.id !== existing.id));
      } else {
        const { error } = await supabase
          .from("habit_logs")
          .update({ value: newValue })
          .eq("id", existing.id);
        if (!error)
          setLogs(
            logs.map((l) =>
              l.id === existing.id ? { ...l, value: newValue } : l,
            ),
          );
      }
    } else {
      const newValue = Math.max(
        0,
        valueChange > 0
          ? valueChange
          : habit.habit_type === "checklist"
            ? 1
            : 0,
      );
      if (newValue === 0) return;
      const { data, error } = await supabase
        .from("habit_logs")
        .insert({
          habit_id: habit.id,
          user_id: userId,
          log_date: dateStr,
          value: newValue,
        })
        .select()
        .single();
      if (!error && data) setLogs([...logs, data as HabitLog]);
    }
  };

  const saveHabit = async () => {
    if (!form.name.trim()) return toast.error("Name required");
    const habitData = {
      user_id: userId,
      name: form.name.trim(),
      icon: form.icon,
      habit_type: form.type,
      target_value: form.target,
      unit: form.unit,
      frequency_type: form.freqType,
      frequency_days: form.freqDays,
      color: form.color,
    };
    if (editingHabit) {
      const { error } = await supabase
        .from("habits")
        .update(habitData)
        .eq("id", editingHabit.id);
      if (!error) fetchAll();
    } else {
      const { error } = await supabase.from("habits").insert(habitData);
      if (!error) fetchAll();
    }
    setShowModal(false);
  };

  const deleteHabit = async (id: string) => {
    if (!confirm("This will delete all history for this habit.")) return;
    await supabase.from("habits").delete().eq("id", id);
    setHabits(habits.filter((h) => h.id !== id));
  };

  const archiveHabit = async (habit: Habit) => {
    const { error } = await supabase
      .from("habits")
      .update({ is_archived: !habit.is_archived })
      .eq("id", habit.id);
    if (!error)
      setHabits(
        habits.map((h) =>
          h.id === habit.id ? { ...h, is_archived: !h.is_archived } : h,
        ),
      );
  };

  // --- Analytics ---
  const calculateStreak = (habit: Habit) => {
    let current = 0;
    let checkDate = startOfDay(new Date());
    const logSet = new Set(
      logs
        .filter((l) => l.habit_id === habit.id && l.value >= habit.target_value)
        .map((l) => l.log_date),
    );

    while (true) {
      const ds = format(checkDate, "yyyy-MM-dd");
      if (isHabitActiveOn(habit, checkDate)) {
        if (logSet.has(ds)) current++;
        else if (isSameDay(checkDate, new Date())) {
        } else break;
      }
      checkDate = subDays(checkDate, 1);
      if (isBefore(checkDate, subDays(new Date(), 60))) break;
    }
    return current;
  };

  const getDailyCompletionCount = (day: Date) => {
    const ds = format(day, "yyyy-MM-dd");
    const activeProtocols = habits.filter((h) => isHabitActiveOn(h, day));
    return logs.filter(
      (l) =>
        l.log_date === ds &&
        activeProtocols.some(
          (h) => h.id === l.habit_id && l.value >= h.target_value,
        ),
    ).length;
  };

  const chartHeight = 140;
  const maxPossible = habits.length || 1;
  const chartWidth = monthDays.length * 55;

  const points = monthDays
    .map((day, i) => {
      const count = getDailyCompletionCount(day);
      const x = i * 55 + 25;
      const y =
        chartHeight -
        (count / Math.max(maxPossible, 1)) * (chartHeight - 40) -
        20;
      return `${x},${y}`;
    })
    .join(" ");

  const fillPath = `M 25,${chartHeight} L ${points} L ${chartWidth - 30},${chartHeight} Z`;

  return (
    <div className="w-full pb-20">
      {/* Sticky inner header */}
      <div className="sticky top-0 z-10 bg-surface pb-1">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-headline tracking-tight text-on-surface text-base font-medium">
              Habits
            </h2>
            <p className="text-[10px] uppercase tracking-[0.3em] text-on-surface/40 font-black mt-0.5">
              Your progress
            </p>
          </div>
          <button
            onClick={() => {
              setEditingHabit(null);
              setForm({
                name: "",
                icon: "⭐",
                type: "checklist",
                target: 1,
                unit: "times",
                freqType: "daily",
                freqDays: [0, 1, 2, 3, 4, 5, 6],
                color: "#9B4000",
              });
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 bg-tertiary text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:opacity-90 active:scale-95 transition-all shadow-sm"
          >
            <TrendingUp size={14} />
            Add Habit
          </button>
        </div>
      </div>

      {/* Enhanced Performance Graph */}
      <div className="mb-10 bg-surface-container-lowest border border-outline-variant/15 rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between mb-8 px-2">
          <div>
            <span className="text-[9px] font-black text-tertiary uppercase tracking-[0.4em] mb-1 block">
              Weekly View
            </span>
            <h3 className="font-headline text-on-surface text-base font-medium">
              {format(new Date(), "MMMM yyyy")}
            </h3>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-on-surface/30 uppercase tracking-widest block">
              Today's Progress
            </span>
            <span className="text-xl font-bold text-tertiary">
              {getDailyCompletionCount(new Date())}{" "}
              <small className="text-xs text-on-surface/30">
                / {maxPossible}
              </small>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar pb-2">
          <div style={{ width: chartWidth }} className="relative h-[180px]">
            <svg
              width={chartWidth}
              height={chartHeight}
              className="overflow-visible pt-4"
            >
              <defs>
                <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00609a" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#00609a" stopOpacity="0" />
                </linearGradient>
              </defs>

              {[0, 0.5, 1].map((p, i) => (
                <line
                  key={i}
                  x1="0"
                  y1={chartHeight - p * (chartHeight - 40) - 20}
                  x2={chartWidth}
                  y2={chartHeight - p * (chartHeight - 40) - 20}
                  stroke="currentColor"
                  className="text-on-surface/5"
                  strokeDasharray="4 4"
                />
              ))}

              <path d={fillPath} fill="url(#areaFill)" />
              <polyline
                fill="none"
                stroke="#00609a"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={points}
                className="drop-shadow-lg"
              />

              {monthDays.map((day, i) => {
                const count = getDailyCompletionCount(day);
                const x = i * 55 + 25;
                const y =
                  chartHeight -
                  (count / Math.max(maxPossible, 1)) * (chartHeight - 40) -
                  20;
                const isToday_ = isSameDay(day, new Date());

                return (
                  <g key={i}>
                    <circle
                      cx={x}
                      cy={y}
                      r={isToday_ ? 5 : 3.5}
                      fill={isToday_ ? "#00609a" : "#00609a66"}
                      className="transition-all"
                    />
                    {count > 0 && (
                      <text
                        x={x}
                        y={y - 12}
                        textAnchor="middle"
                        className="text-[9px] font-black fill-tertiary"
                      >
                        {count}
                      </text>
                    )}
                    <text
                      x={x}
                      y={chartHeight + 15}
                      textAnchor="middle"
                      className={`text-[9px] font-black ${isToday_ ? "fill-tertiary" : "fill-on-surface/20"}`}
                    >
                      {format(day, "d")}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* Habits Weekly Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <h4 className="text-[10px] uppercase tracking-[0.4em] text-on-surface/40 text-base font-medium">
            {showArchived ? "History" : "Your Habits"}
          </h4>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-tertiary hover:opacity-70 transition-all"
          >
            {showArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
            {showArchived ? "Back to habits" : "View Archive"}
          </button>
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl shadow-sm overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse">
            <thead>
              <tr className="border-b border-outline-variant/10">
                <th className="sticky left-0 z-20 bg-surface-container-lowest shadow-[4px_0_12px_rgba(0,0,0,0.02)] px-3 py-4 text-left text-[10px] font-black uppercase tracking-widest text-on-surface/30 max-w-[120px] sm:max-w-[160px]">
                  Habit Name
                </th>
                {days.map((day, i) => (
                  <th key={i} className="px-2 py-4 text-center">
                    <div
                      className={`text-[9px] font-black uppercase tracking-widest ${isSameDay(day, today) ? "text-primary" : "text-on-surface/20"}`}
                    >
                      {format(day, "EEE")}
                    </div>
                    <div
                      className={`text-[11px] font-bold ${isSameDay(day, today) ? "text-primary" : "text-on-surface/40"}`}
                    >
                      {format(day, "d")}
                    </div>
                  </th>
                ))}
                <th className="sticky right-0 z-20 bg-surface-container-lowest shadow-[-4px_0_12px_rgba(0,0,0,0.02)] px-2 py-4 text-center text-[10px] font-black uppercase tracking-widest text-on-surface/30 w-[60px]">
                  Streak
                </th>
              </tr>
            </thead>
            <tbody>
              {currentHabits.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="py-20 text-center text-[11px] font-bold uppercase tracking-widest text-on-surface/10 "
                  >
                    No habits added yet
                  </td>
                </tr>
              ) : (
                currentHabits.map((habit) => {
                  const streak = calculateStreak(habit);
                  return (
                    <tr
                      key={habit.id}
                      className="border-b border-outline-variant/5 last:border-none hover:bg-surface-container/30 transition-all group"
                    >
                      <td className="sticky left-0 z-10 bg-surface-container-lowest shadow-[4px_0_12px_rgba(0,0,0,0.02)] group-hover:bg-surface-container/30 transition-all px-3 py-4 max-w-[120px] sm:max-w-[160px]">
                        <div className="flex items-center gap-2">
                          <span className="text-xl shrink-0">{habit.icon}</span>
                          <div className="min-w-0">
                            <h5 className="text-sm text-on-surface text-base font-medium truncate">
                              {habit.name}
                            </h5>
                            <span className="text-[9px] font-bold text-on-surface/30 uppercase tracking-widest block truncate">
                              Target: {habit.target_value} {habit.unit}
                            </span>
                          </div>
                        </div>
                      </td>
                      {days.map((day, i) => {
                        const log = getLogForDay(habit.id, day);
                        const isToday_ = isSameDay(day, today);
                        const isActive = isHabitActiveOn(habit, day);
                        const progress = log
                          ? log.value / habit.target_value
                          : 0;
                        const isDone = progress >= 1;

                        return (
                          <td key={i} className="px-1 py-4 text-center">
                            {!isActive ? (
                              <div className="w-2 h-2 rounded-full bg-on-surface/5 mx-auto" />
                            ) : habit.habit_type === "checklist" ? (
                              <button
                                onClick={() =>
                                  isToday_ && logHabit(habit, day, 1)
                                }
                                className={`w-9 h-9 rounded-2xl mx-auto flex items-center justify-center transition-all ${isDone ? "bg-primary text-white shadow-lg shadow-primary/20 scale-105" : isToday_ ? "bg-surface-container border border-outline/20 text-on-surface/20 hover:border-primary/40" : "bg-on-surface/5 text-on-surface/10 cursor-not-allowed"}`}
                              >
                                {isDone && <CheckCircle2 size={16} />}
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  isToday_ && setAdjustingLog({ habit, day })
                                }
                                className={`w-10 h-10 rounded-2xl mx-auto flex flex-col items-center justify-center transition-all relative overflow-hidden border ${isDone ? "bg-primary border-primary text-white shadow-lg" : isToday_ ? "bg-surface-container border-outline-variant/20 text-on-surface" : "bg-on-surface/5 border-transparent opacity-40 grayscale"}`}
                              >
                                <div
                                  className="absolute inset-x-0 bottom-0 bg-white/20 transition-all"
                                  style={{
                                    height: `${Math.min(100, progress * 100)}%`,
                                  }}
                                />
                                <span className="text-[10px] font-black z-10">
                                  {log?.value || 0}
                                </span>
                                <span className="text-[7px] font-black uppercase z-10 opacity-60">
                                  /{habit.target_value}
                                </span>
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="sticky right-0 z-10 bg-surface-container-lowest shadow-[-4px_0_12px_rgba(0,0,0,0.02)] group-hover:bg-surface-container/30 transition-all px-2 py-4 w-[60px]">
                        <div className="flex items-center justify-end h-full relative">
                          <div className="absolute right-2 opacity-100 group-hover:opacity-0 transition-opacity duration-200">
                            {streak > 0 && (
                              <span className="text-sm font-black text-primary whitespace-nowrap">
                                🔥{streak}
                              </span>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute right-2 bg-surface-container-lowest/90 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-outline-variant/20">
                            <button
                              onClick={() => {
                                setEditingHabit(habit);
                                setForm({
                                  name: habit.name,
                                  icon: habit.icon,
                                  type: habit.habit_type,
                                  target: habit.target_value,
                                  unit: habit.unit,
                                  freqType: habit.frequency_type,
                                  freqDays: habit.frequency_days,
                                  color: habit.color,
                                });
                                setShowModal(true);
                              }}
                              className="p-1.5 text-on-surface-variant/30 hover:text-tertiary hover:bg-surface-container rounded-lg transition-all"
                            >
                              <Settings2 size={14} />
                            </button>
                            <button
                              onClick={() => archiveHabit(habit)}
                              className="p-1.5 text-on-surface-variant/30 hover:text-orange-500 hover:bg-surface-container rounded-lg transition-all"
                            >
                              <Archive size={14} />
                            </button>
                            {showArchived && (
                              <button
                                onClick={() => deleteHabit(habit.id)}
                                className="p-1.5 text-on-surface-variant/30 hover:text-red-500 hover:bg-surface-container rounded-lg transition-all"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Numeric Popover */}
      {adjustingLog && (
        <div
          className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setAdjustingLog(null)}
        >
          <div
            className="bg-surface-container-lowest border border-outline-variant/20 rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 max-h-[70vh] md:max-h-[75vh] overflow-y-auto custom-scrollbar"
            onClick={(e) => e.stopPropagation()}
          >
            <h5 className="text-[10px] uppercase tracking-widest text-on-surface/40 mb-4 text-center text-base font-medium">
              Adjust Output: {adjustingLog.habit.name}
            </h5>
            <div className="flex items-center gap-6">
              <button
                onClick={() =>
                  logHabit(adjustingLog.habit, adjustingLog.day, -1)
                }
                className="w-12 h-12 rounded-2xl bg-surface-container text-on-surface flex items-center justify-center hover:bg-surface-container-high active:scale-95 transition-all"
              >
                <Minus size={20} />
              </button>
              <div className="flex flex-col items-center">
                <span className="text-3xl font-black text-on-surface">
                  {getLogForDay(adjustingLog.habit.id, adjustingLog.day)
                    ?.value || 0}
                </span>
                <span className="text-[10px] font-bold text-on-surface/30">
                  of {adjustingLog.habit.target_value} {adjustingLog.habit.unit}
                </span>
              </div>
              <button
                onClick={() =>
                  logHabit(adjustingLog.habit, adjustingLog.day, 1)
                }
                className="w-12 h-12 rounded-2xl bg-tertiary text-white flex items-center justify-center shadow-xl active:scale-95 transition-all"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest border border-outline-variant/15 rounded-2xl w-full max-w-md p-8 shadow-2xl animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[70vh] md:max-h-[75vh] custom-scrollbar">
            <div className="flex items-center justify-between mb-8">
              <h3 className="font-headline text-on-surface text-base font-medium">
                {editingHabit ? "Edit Habit" : "Add Habit"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 text-on-surface/20 hover:text-on-surface"
              >
                <X size={20} />
              </button>
            </div>
            <div className="space-y-6">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-2 block">
                    Habit Name
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g., Morning Walk"
                    className="w-full bg-surface-container border-none rounded-2xl px-5 py-3.5 text-sm font-bold text-on-surface outline-none focus:ring-1 focus:ring-tertiary/20"
                  />
                </div>
                <div className="w-20">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-2 block">
                    Avatar
                  </label>
                  <select
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-full bg-surface-container border-none rounded-2xl px-3 py-3.5 text-xl outline-none"
                  >
                    {EMOJI_OPTIONS.map((e) => (
                      <option key={e} value={e}>
                        {e}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-2 block">
                    Tracking Type
                  </label>
                  <div className="flex bg-surface-container p-1 rounded-xl">
                    <button
                      onClick={() =>
                        setForm({ ...form, type: "checklist", target: 1 })
                      }
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${form.type === "checklist" ? "bg-tertiary text-white shadow-sm" : "text-on-surface/40"}`}
                    >
                      Yes/No
                    </button>
                    <button
                      onClick={() => setForm({ ...form, type: "numeric" })}
                      className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest ${form.type === "numeric" ? "bg-tertiary text-white shadow-sm" : "text-on-surface/40"}`}
                    >
                      Number
                    </button>
                  </div>
                </div>
                {form.type === "numeric" && (
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-2 block">
                        Goal
                      </label>
                      <input
                        type="number"
                        value={form.target}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            target: parseInt(e.target.value) || 0,
                          })
                        }
                        className="w-full bg-surface-container border-none rounded-xl px-3 py-2 text-sm font-bold"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-2 block">
                        Unit
                      </label>
                      <input
                        type="text"
                        value={form.unit}
                        onChange={(e) =>
                          setForm({ ...form, unit: e.target.value })
                        }
                        className="w-full bg-surface-container border-none rounded-xl px-3 py-2 text-[10px] font-bold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[9px] font-black uppercase tracking-widest text-on-surface/30 mb-3 block">
                  Repeat Days
                </label>
                <div className="flex bg-surface-container p-1 rounded-2xl mb-4">
                  <button
                    onClick={() =>
                      setForm({
                        ...form,
                        freqType: "daily",
                        freqDays: [0, 1, 2, 3, 4, 5, 6],
                      })
                    }
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${form.freqType === "daily" ? "bg-white text-on-surface shadow-sm" : "text-on-surface/40"}`}
                  >
                    Daily
                  </button>
                  <button
                    onClick={() =>
                      setForm({ ...form, freqType: "specific_days" })
                    }
                    className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${form.freqType === "specific_days" ? "bg-white text-on-surface shadow-sm" : "text-on-surface/40"}`}
                  >
                    Custom
                  </button>
                </div>
                {form.freqType === "specific_days" && (
                  <div className="flex justify-between gap-1">
                    {DAYS_SHORT.map((day, i) => (
                      <button
                        key={day}
                        onClick={() =>
                          setForm({
                            ...form,
                            freqDays: form.freqDays.includes(i)
                              ? form.freqDays.filter((d) => d !== i)
                              : [...form.freqDays, i],
                          })
                        }
                        className={`w-9 h-9 rounded-full text-[10px] font-black transition-all ${form.freqDays.includes(i) ? "bg-tertiary text-white shadow-lg" : "bg-surface-container text-on-surface/30"}`}
                      >
                        {day[0]}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="mt-10 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-on-surface/40 hover:bg-surface-container transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveHabit}
                className="flex-1 py-4 bg-tertiary text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-tertiary/20 hover:scale-[1.02] active:scale-95 transition-all"
              >
                Save Habit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
