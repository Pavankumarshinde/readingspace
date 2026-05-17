"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Search, LogIn, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, isSameDay, startOfDay, endOfDay,
  getDaysInMonth, getDay, isSameWeek, isSameMonth,
} from "date-fns";
import { useRealtimeAttendance } from "@/hooks/useRealtimeAttendance";
import toast from "react-hot-toast";
import StudentPlanBillingModal from "./StudentPlanBillingModal";

type Timeframe = "day" | "week" | "month";

export default function RoomDashboardTab({ roomId, roomName }: { roomId: string; roomName: string }) {
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<Timeframe>("day");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [expiringPlans, setExpiringPlans] = useState<any[]>([]);
  const [expiringViewDate, setExpiringViewDate] = useState<Date>(new Date());
  const [expiringLoading, setExpiringLoading] = useState(true);
  const [heatmap, setHeatmap] = useState<Record<number, number>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(true);
  const [searchTermExpiring, setSearchTermExpiring] = useState("");
  const [searchTermHistory, setSearchTermHistory] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalSessions, setTotalSessions] = useState(0);
  const limit = 50;

  useEffect(() => {
    setPage(1);
  }, [timeframe, selectedDate]);

  // Plan & Billing Modal State
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [selectedStudentForInstallments, setSelectedStudentForInstallments] = useState<any>(null);

  const realtimeLogs = useRealtimeAttendance(roomId);

  const displaySessions = sessions.filter((s) =>
    (s.student?.name || "").toLowerCase().includes(searchTermHistory.toLowerCase())
  );

  // Busy hours computed from sessions (all hours present)
  const hourCounts = Array(24).fill(0);
  sessions.forEach((s) => {
    const start = new Date(s.check_in_at);
    const end = s.check_out_at ? new Date(s.check_out_at) : new Date();
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
    
    const startHour = start.getHours();
    let endHour = end.getHours();
    
    // If checkout is on a different day, limit to 23
    if (end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth()) {
        endHour = 23;
    }
    
    if (startHour <= endHour) {
      for (let h = startHour; h <= endHour; h++) {
        if (h >= 0 && h < 24) hourCounts[h]++;
      }
    }
  });
  const maxHourCount = Math.max(...hourCounts, 1);
  // All 24 hours on x-axis (0=12AM ... 23=11PM)
  const allHours = Array.from({ length: 24 }, (_, i) => i);
  const xLabels = ["12A","1A","2A","3A","4A","5A","6A","7A","8A","9A","10A","11A","12P","1P","2P","3P","4P","5P","6P","7P","8P","9P","10P","11P"];

  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      setAttendanceLoading(true);
      const supabase = createClient();

      let rangeStart: Date, rangeEnd: Date;
      if (timeframe === "day") {
        rangeStart = startOfDay(selectedDate);
        rangeEnd = endOfDay(selectedDate);
      } else if (timeframe === "week") {
        rangeStart = startOfWeek(selectedDate);
        rangeEnd = endOfWeek(selectedDate);
      } else {
        rangeStart = startOfMonth(selectedDate);
        rangeEnd = endOfMonth(selectedDate);
      }

      // Fetch sessions for chosen range via Supabase directly
      const dateFrom = format(rangeStart, "yyyy-MM-dd");
      const dateTo = format(rangeEnd, "yyyy-MM-dd");
      
      let sessData = [];
      try {
        const offset = (page - 1) * limit;
        const { data, count, error } = await supabase
          .from("attendance_sessions")
          .select("*, student:profiles(name, email)", { count: "exact" })
          .eq("room_id", roomId)
          .gte("date", dateFrom)
          .lte("date", dateTo)
          .order("check_in_at", { ascending: false })
          .range(offset, offset + limit - 1);

        if (error) throw error;
        sessData = data || [];
        setTotalSessions(count || 0);
      } catch (err) {
        console.error("Failed to fetch sessions via Supabase", err);
      }

      // Enrich with seat numbers
      const { data: seats } = await supabase
        .from("subscriptions")
        .select("student_id, seat_number")
        .eq("room_id", roomId)
        .eq("status", "active");
      const seatMap = new Map((seats || []).map((s: any) => [s.student_id, s.seat_number]));
      setSessions((sessData || []).map((s: any) => ({ ...s, seat_number: seatMap.get(s.student_id) || "N/A" })));

      // Heatmap (attendance_logs count per day this month)
      const monthStart = startOfMonth(viewDate);
      const monthEnd = endOfMonth(viewDate);
      const { data: monthDots } = await supabase
        .from("attendance_logs")
        .select("timestamp")
        .eq("room_id", roomId)
        .gte("timestamp", monthStart.toISOString())
        .lte("timestamp", monthEnd.toISOString());
      const heatMapData: Record<number, number> = {};
      monthDots?.forEach((log: any) => {
        const d = new Date(log.timestamp).getDate();
        heatMapData[d] = (heatMapData[d] || 0) + 1;
      });
      setHeatmap(heatMapData);

      setAttendanceLoading(false);
      setLoading(false);
    };
    fetchDashboardData();
  }, [roomId, timeframe, selectedDate, viewDate, page]);

  useEffect(() => {
    const fetchExpiringPlans = async () => {
      setExpiringLoading(true);
      const supabase = createClient();
      const startMonth = startOfDay(startOfMonth(expiringViewDate));
      const endMonth = endOfDay(endOfMonth(expiringViewDate));
      const today = startOfDay(new Date());

      // Fetch all active subscriptions and their installments to find true expiry
      const { data: subs } = await supabase
        .from("subscriptions")
        .select(`id, seat_number, status, room_id, student_id, student:profiles!inner(name, email), installments (id, end_date, status)`)
        .eq("room_id", roomId)
        .eq("status", "active");

      if (subs) {
        const plans = subs.map((sub: any) => {
          // Find latest paid or overall latest installment for effective end date
          const insts = sub.installments || [];
          const paidInsts = insts.filter((i: any) => i.status === "paid");
          let effectiveEndStr = sub.end_date;
          if (paidInsts.length > 0) {
            effectiveEndStr = paidInsts.reduce((max: string, i: any) => i.end_date > max ? i.end_date : max, paidInsts[0].end_date);
          } else if (insts.length > 0) {
            effectiveEndStr = insts.reduce((max: string, i: any) => i.end_date > max ? i.end_date : max, insts[0].end_date);
          }
          
          const endDate = startOfDay(new Date(effectiveEndStr));
          return {
            studentUid: sub.student_id,
            subscriptionId: sub.id,
            status: sub.status,
            email: sub.student?.email || "",
            name: sub.student?.name || "Unknown",
            initial: (sub.student?.name || "U").substring(0, 2).toUpperCase(),
            seat: sub.seat_number,
            daysLeft: Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 3600 * 24)),
            isExpired: endDate < today,
            endDate,
          };
        }).filter(p => p.endDate >= startMonth && p.endDate <= endMonth)
          .sort((a, b) => a.endDate.getTime() - b.endDate.getTime());

        setExpiringPlans(plans);
      } else {
        setExpiringPlans([]);
      }
      setExpiringLoading(false);
    };
    fetchExpiringPlans();
  }, [roomId, expiringViewDate]);

  const handleRegenerateRoomQR = async () => {
    if (!confirm("This will invalidate the current Room QR code. All physical prints of the old QR will stop working. Proceed?")) return;
    try {
      const res = await fetch("/api/manager/rooms/regenerate-qr", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roomId }) });
      if (res.ok) { toast.success("Room QR regenerated successfully"); window.location.reload(); }
      else { const err = await res.json(); toast.error(err.error || "Failed to regenerate"); }
    } catch { toast.error("Network failure"); }
  };

  const fmtTime = (ts: string) => new Date(ts).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
  const durationLabel = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return null;
    const mins = Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 60000);
    return mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins}m`;
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* LEFT: Heatmap Calendar */}
        <div className="space-y-8">
          <div className="card bg-white border border-outline-variant/10 rounded-[2.5rem] p-8">
            <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-start justify-between">
                <div className="flex flex-col">
                  <h3 className="text-on-surface text-base font-medium">Attendance Heatmap</h3>
                  <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">{format(viewDate, "MMMM yyyy")}</p>
                </div>
                <div className="flex gap-2">
                  <button aria-label="Previous month" onClick={() => setViewDate(subMonths(viewDate, 1))} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors">
                    <ChevronLeft size={18} />
                  </button>
                  <button aria-label="Next month" onClick={() => setViewDate(addMonths(viewDate, 1))} className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-surface-container-low flex items-center justify-center hover:bg-surface-container transition-colors">
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-on-surface-variant/50 uppercase tracking-widest shrink-0">Range :</span>
                <select value={timeframe} onChange={(e) => setTimeframe(e.target.value as Timeframe)}
                  className="bg-surface-container-low border-none rounded-lg text-[10px] font-black text-primary uppercase tracking-widest px-3 py-1.5 outline-none cursor-pointer hover:bg-surface-container transition-colors">
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-y-4 text-center">
              {["S","M","T","W","T","F","S"].map((d, i) => (
                <span key={`${d}-${i}`} className="text-[9px] font-black text-on-surface-variant/20 uppercase tracking-widest mb-2">{d}</span>
              ))}
              {Array.from({ length: getDay(startOfMonth(viewDate)) }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: getDaysInMonth(viewDate) }).map((_, i) => {
                const day = i + 1;
                const count = heatmap[day] || 0;
                const currentDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day);
                const isRangeHighlighted =
                  (timeframe === "day" && isSameDay(selectedDate, currentDate)) ||
                  (timeframe === "week" && isSameWeek(selectedDate, currentDate)) ||
                  (timeframe === "month" && isSameMonth(selectedDate, currentDate));
                const base = count === 0 ? "bg-transparent text-on-surface/30 hover:bg-surface-container-low" :
                  count <= 5 ? "bg-green-100 text-green-800" : count <= 15 ? "bg-green-300 text-green-900" :
                  count <= 30 ? "bg-green-500 text-white" : "bg-green-700 text-white";
                return (
                  <button key={day} onClick={() => setSelectedDate(currentDate)}
                    className={`relative w-10 h-10 mx-auto rounded-xl flex items-center justify-center text-xs font-black transition-all ${base} ${isRangeHighlighted ? "ring-2 ring-primary ring-offset-2 scale-105 shadow-sm" : ""}`}>
                    {day}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Busy Hours Histogram */}
          <div className="card bg-white border border-outline-variant/10 rounded-[2.5rem] p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-on-surface text-base font-medium">Busy Hours</h3>
                <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-1">
                  {timeframe === "day" ? format(selectedDate, "do MMMM") : timeframe === "week" ? `Week of ${format(startOfWeek(selectedDate), "do MMM")}` : format(selectedDate, "MMMM yyyy")}
                </p>
              </div>
            </div>
          {attendanceLoading ? (
              <div className="h-32 flex items-center justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
            ) : (() => {
              const svgW = 24 * 32; // ~768 logical units
              const svgH = 96;
              const padL = 28; const padB = 20; const padT = 12; const padR = 8;
              const plotW = svgW - padL - padR;
              const plotH = svgH - padT - padB;
              const pts = allHours.map((h, i) => ({
                x: padL + (i / 23) * plotW,
                y: padT + plotH - (hourCounts[h] / maxHourCount) * plotH,
                count: hourCounts[h],
              }));
              const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
              return (
                <div className="overflow-x-auto">
                  <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[480px]" style={{ height: svgH }}>
                    {/* Y-axis label */}
                    <text x="2" y={padT + plotH / 2} fontSize="7" fill="#94a3b8" textAnchor="middle"
                      transform={`rotate(-90, 8, ${padT + plotH / 2})`} fontWeight="700" letterSpacing="1">
                      Sessions
                    </text>
                    {/* Grid line at max */}
                    <line x1={padL} y1={padT} x2={svgW - padR} y2={padT} stroke="#e2e8f0" strokeWidth="0.5" strokeDasharray="3 3" />
                    <line x1={padL} y1={padT + plotH} x2={svgW - padR} y2={padT + plotH} stroke="#e2e8f0" strokeWidth="0.5" />
                    {/* Line */}
                    <path d={pathD} fill="none" stroke="#3b82f6" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                    {/* Dots */}
                    {pts.map((p, i) => (
                      <g key={i}>
                        <circle cx={p.x} cy={p.y} r={p.count > 0 ? 3 : 1.5}
                          fill={p.count > 0 ? "#3b82f6" : "#cbd5e1"} stroke="white" strokeWidth="1" />
                        {p.count > 0 && (
                          <text x={p.x} y={p.y - 5} fontSize="6" fill="#1e40af" textAnchor="middle" fontWeight="700">{p.count}</text>
                        )}
                      </g>
                    ))}
                    {/* X-axis labels — show every 2nd label on mobile */}
                    {allHours.map((h, i) => (
                      <text key={h} x={pts[i].x} y={svgH - 4} fontSize="6.5" fill="#94a3b8"
                        textAnchor="middle" fontWeight="700">{xLabels[i]}</text>
                    ))}
                  </svg>
                </div>
              );
            })()}
            {sessions.length === 0 && !attendanceLoading && (
              <p className="text-center text-[10px] font-bold text-on-surface-variant/30 uppercase tracking-widest mt-4">No sessions in this period</p>
            )}
          </div>
        </div>

        {/* RIGHT: Expiring Plans */}
        <div className="relative h-[500px] lg:h-auto w-full">
          <div className="lg:absolute lg:inset-0 w-full h-full">
            <div className="card bg-white border border-outline-variant/10 rounded-[2.5rem] p-6 lg:p-8 h-full flex flex-col w-full">
              <div className="flex flex-col gap-4 mb-6 shrink-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-on-surface text-base font-medium">Upcoming Expiries</h3>
                  <div className="flex items-center gap-1.5 bg-surface-container-low rounded-xl p-1">
                    <button aria-label="Previous month" onClick={() => setExpiringViewDate(subMonths(expiringViewDate, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-white hover:shadow-sm transition-all"><ChevronLeft size={16} /></button>
                    <span className="text-[10px] font-black uppercase tracking-widest px-1 min-w-[70px] text-center text-primary">{format(expiringViewDate, "MMM yy")}</span>
                    <button aria-label="Next month" onClick={() => setExpiringViewDate(addMonths(expiringViewDate, 1))} className="w-7 h-7 rounded-lg flex items-center justify-center text-on-surface-variant hover:bg-white hover:shadow-sm transition-all"><ChevronRight size={16} /></button>
                  </div>
                </div>
                <div className="relative w-full">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
                  <input type="text" placeholder="Search students..." value={searchTermExpiring} onChange={(e) => setSearchTermExpiring(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-surface-container-lowest rounded-2xl text-[11px] font-bold border border-outline-variant/10 focus:border-primary/30 outline-none uppercase tracking-wider placeholder:text-on-surface-variant/40" />
                </div>
              </div>
              <div className="scroll-area space-y-3 pr-2 custom-scrollbar min-h-0">
                {expiringLoading ? (
                  <div className="py-12 flex justify-center"><div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" /></div>
                ) : (
                  <>
                    {expiringPlans.filter(p => p.name.toLowerCase().includes(searchTermExpiring.toLowerCase())).map((plan, i) => (
                      <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${plan.isExpired ? "bg-error-container/10 border-error/10" : "bg-surface-container-lowest border-outline-variant/5"}`}>
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-[10px] font-black ${plan.isExpired ? "bg-error text-white" : "bg-surface-container-low text-on-surface"}`}>{plan.initial}</div>
                          <div>
                            <p className="text-[11px] font-black text-on-surface uppercase tracking-tight">{plan.name}</p>
                            <p className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest mt-0.5">Seat #{plan.seat}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {plan.isExpired ? (
                              <span className="text-[10px] font-black text-error uppercase tracking-widest">Expired</span>
                            ) : (
                              <div className="flex flex-col items-end gap-0.5">
                                <span className="text-[8px] font-semibold text-on-surface-variant/60">Expires on</span>
                                <span className="text-[11px] font-black text-primary">{format(plan.endDate, "dd MMM")}</span>
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => {
                              setSelectedStudentForInstallments(plan);
                              setShowInstallmentsModal(true);
                            }}
                            className="w-8 h-8 flex items-center justify-center bg-surface-container-low border border-outline-variant/10 shadow-sm rounded-lg text-primary hover:bg-primary hover:text-white transition-colors"
                            title="Renew / Payments"
                            aria-label="Renew or view payments"
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>receipt_long</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {expiringPlans.length === 0 && (
                      <div className="py-12 text-center text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-relaxed">
                        No plans expiring in <br /><span className="text-primary">{format(expiringViewDate, "MMMM yyyy")}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sessions History Table */}
      <div className="card shadow-sm border border-outline-variant/10 bg-white rounded-[2.5rem] overflow-hidden flex flex-col">
        <div className="px-6 lg:px-10 py-6 lg:py-8 border-b border-outline-variant/5 bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex flex-col gap-1">
            <h4 className="text-[10px] text-primary uppercase tracking-[0.3em] font-black">Check-In / Check-Out History</h4>
            <h3 className="text-on-surface text-base font-medium">
              {timeframe === "day" ? format(selectedDate, "do MMMM") : timeframe === "week" ? `Week of ${format(startOfWeek(selectedDate), "do MMM")}` : format(selectedDate, "MMMM yyyy")} Attendance
            </h3>
          </div>
          <div className="relative w-full md:w-64 shrink-0">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input type="text" placeholder="Search by name..." value={searchTermHistory} onChange={(e) => setSearchTermHistory(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl text-[11px] font-bold border border-outline-variant/10 focus:border-primary/30 outline-none uppercase tracking-wider placeholder:text-on-surface-variant/40" />
          </div>
        </div>
        <div className="overflow-x-auto overflow-y-auto max-h-[420px] custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-surface-container-lowest z-10 shadow-[0_1px_2px_rgba(0,0,0,0.02)]">
              <tr className="border-b border-outline-variant/5">
                <th className="px-6 lg:px-10 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.3em]">Student</th>
                <th className="px-4 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.3em]">Seat</th>
                <th className="px-4 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.3em]">Check In</th>
                <th className="px-4 py-5 text-[9px] font-black text-secondary uppercase tracking-[0.3em]">Check Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-low/30">
              {attendanceLoading ? (
                <tr><td colSpan={4} className="py-20 text-center"><div className="w-8 h-8 border-[3px] border-primary border-t-transparent rounded-full animate-spin mx-auto" /></td></tr>
              ) : displaySessions.length === 0 ? (
                <tr><td colSpan={4} className="py-20 text-center text-[10px] font-black text-on-surface-variant/30 uppercase tracking-[0.3em]">No records found</td></tr>
              ) : displaySessions.map((s, i) => {
                const isOpen = !s.check_out_at;
                const dur = durationLabel(s.check_in_at, s.check_out_at);
                return (
                  <tr key={i} className="group hover:bg-surface-container-low/40 transition-all duration-200">
                    <td className="px-6 lg:px-10 py-4">
                      <p className="text-sm font-black text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">{s.student?.name || "-"}</p>
                      <p className="text-[9px] text-secondary/60 font-bold">{format(new Date(s.date), "dd MMM yyyy")}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-surface-container-low text-[10px] font-black">#{s.seat_number}</span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><LogIn size={10} /></div>
                        <span className="text-[10px] font-black text-on-surface tracking-[0.05em]">{fmtTime(s.check_in_at)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {isOpen ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 px-2 py-0.5 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Inside
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><LogOut size={10} /></div>
                          <span className="text-[10px] font-black text-on-surface tracking-[0.05em]">
                            {fmtTime(s.check_out_at)}
                            {s.is_auto_checkout && <span className="ml-1 text-orange-400">(auto)</span>}
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {totalSessions > limit && (
          <div className="px-6 py-4 border-t border-outline-variant/5 bg-surface-container-lowest flex items-center justify-between">
            <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
              Showing {(page - 1) * limit + 1} - {Math.min(page * limit, totalSessions)} of {totalSessions}
            </span>
            <div className="flex gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page * limit >= totalSessions}
                onClick={() => setPage(p => p + 1)}
                className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Student Plan & Billing Modal */}
      {showInstallmentsModal && selectedStudentForInstallments && (
        <StudentPlanBillingModal
          open={showInstallmentsModal}
          onClose={() => setShowInstallmentsModal(false)}
          roomId={roomId}
          student={selectedStudentForInstallments}
          onUpdate={() => {
            // Re-fetch expiring plans when a payment changes
            setExpiringViewDate(new Date(expiringViewDate.getTime())); 
          }}
        />
      )}
    </div>
  );
}
