"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import {
  Camera,
  RefreshCw,
  UserCircle,
  QrCode,
  Search,
  User,
  LogOut,
  LogIn,
  Activity,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface AttendanceScannerProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

type TabMode = "scan" | "search" | "feed";

export default function AttendanceScanner({
  roomId,
  roomName,
  onClose,
}: AttendanceScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [lastScanned, setLastScanned] = useState<any>(null);
  const scannedRef = useRef(false);
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabMode>("scan");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [todaySessions, setTodaySessions] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchStudents() {
      setLoadingStudents(true);
      try {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        }).format(new Date());
        const [{ data: students }, sessionsResult] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("id, seat_number, qr_version, student:profiles!inner(id, name, email)")
            .eq("room_id", roomId),
          fetch(`/api/manager/attendance/sessions?roomId=${roomId}&date=${today}`)
            .then(r => r.json()).then(d => ({ data: d.sessions || [] })).catch(() => ({ data: [] })),
        ]);

        setAllStudents(students || []);

        const enriched = (sessionsResult.data as any[]).map((s: any) => {
          const st = (students || []).find((sub: any) => sub.student?.id === s.student_id);
          return { ...s, student: st?.student || null };
        });
        setTodaySessions(enriched.sort((a, b) =>
          new Date(b.check_in_at).getTime() - new Date(a.check_in_at).getTime()
        ));
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingStudents(false);
      }
    }
    fetchStudents();

    // Real-time listeners for attendance_sessions
    const channel = supabase
      .channel("scanner-session-updates")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "attendance_sessions",
        filter: `room_id=eq.${roomId}`,
      }, async (payload: any) => {
        const newSession = payload.new;
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        if (newSession.date !== today) return;
        const { data: student } = await supabase.from("profiles").select("name, email").eq("id", newSession.student_id).single();
        setTodaySessions(prev => [{ ...newSession, student }, ...prev]);
      })
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "attendance_sessions",
        filter: `room_id=eq.${roomId}`,
      }, (payload: any) => {
        const updated = payload.new;
        const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
        if (updated.date !== today) return;
        setTodaySessions(prev => prev.map(s => s.id === updated.id ? { ...s, ...updated } : s));
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId, supabase]);

  // ── QR Scanner ─────────────────────────────────────────────────────────────
  useEffect(() => {
    let codeReader: BrowserQRCodeReader | null = null;
    let controls: any = null;

    async function startScanner() {
      try {
        try {
          const { Camera } = await import("@capacitor/camera");
          const p = await Camera.checkPermissions();
          if (p.camera !== "granted") await Camera.requestPermissions();
        } catch {}

        codeReader = new BrowserQRCodeReader();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(d => d.kind === "videoinput");

        if (videoInputDevices.length === 0) {
          toast.error("No camera found");
          onClose();
          return;
        }

        const backCamera = videoInputDevices.find(d => d.label.toLowerCase().includes("back")) || videoInputDevices[0];

        controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          async (result, error) => {
            if (!result || scannedRef.current) return;
            scannedRef.current = true;
            setScanning(true);

            try {
              const payload = JSON.parse(result.getText());
              if (payload.type !== "access_verify") throw new Error("Invalid QR Code type");

              const res = await fetch("/api/manager/attendance/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ studentId: payload.studentId, roomId, version: payload.version || 0 }),
              });
              const data = await res.json();

              if (res.ok) {
                const isCheckOut = data.action === "check_out";
                if (isCheckOut) {
                  toast(`${data.student?.name || "Student"} checked out`, {
                    icon: "🚪",
                    style: { borderRadius: "10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: "12px", fontWeight: "bold" },
                  });
                  setTodaySessions(prev => prev.map(s =>
                    s.student_id === payload.studentId && !s.check_out_at
                      ? { ...s, check_out_at: data.check_out_at || new Date().toISOString() }
                      : s
                  ));
                } else {
                  toast.success(`${data.student?.name || "Student"} checked in`);
                  setTodaySessions(prev => [{
                    id: `local-${Date.now()}`,
                    student_id: payload.studentId,
                    check_in_at: data.check_in_at || new Date().toISOString(),
                    check_out_at: null,
                    student: data.student,
                  }, ...prev]);
                }
                setLastScanned({ ...data.student, action: data.action });
                setTimeout(() => { scannedRef.current = false; setScanning(false); }, 2000);
              } else {
                throw new Error(data.error || "Failed to log attendance");
              }
            } catch (err: any) {
              toast.error(err.message || "Verification failed");
              scannedRef.current = false;
              setScanning(false);
            }
          },
        );
        setLoading(false);
      } catch (err) {
        console.error("Scanner Error:", err);
        toast.error("Could not access camera");
        onClose();
      }
    }

    startScanner();
    return () => {
      try { controls?.stop(); } catch {}
      try { codeReader?.reset(); } catch {}
    };
  }, [roomId]);

  // ── Manual Mark ─────────────────────────────────────────────────────────────
  const handleManualMark = async (student: any) => {
    if (scanning) return;
    setScanning(true);
    try {
      const res = await fetch("/api/manager/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId: student.student.id, roomId, version: student.qr_version || 0 }),
      });
      const data = await res.json();
      if (res.ok) {
        const isCheckOut = data.action === "check_out";
        if (isCheckOut) {
          toast(`${data.student?.name} checked out`, { icon: "🚪", style: { borderRadius: "10px", background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe", fontSize: "12px", fontWeight: "bold" } });
          setTodaySessions(prev => prev.map(s =>
            s.student_id === student.student.id && !s.check_out_at
              ? { ...s, check_out_at: data.check_out_at || new Date().toISOString() }
              : s
          ));
        } else {
          toast.success(`${data.student?.name} checked in`);
          setTodaySessions(prev => [{
            id: `local-${Date.now()}`,
            student_id: student.student.id,
            check_in_at: data.check_in_at || new Date().toISOString(),
            check_out_at: null,
            student: data.student,
          }, ...prev]);
        }
        setLastScanned({ ...data.student, action: data.action });
        setTimeout(() => setScanning(false), 1500);
      } else {
        throw new Error(data.error || "Failed");
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      setScanning(false);
    }
  };

  // ── Derived State ──────────────────────────────────────────────────────────
  const insideStudentIds = new Set(todaySessions.filter(s => !s.check_out_at).map(s => s.student_id));
  const totalTodayStudentIds = new Set(todaySessions.map(s => s.student_id));
  const filteredResults = allStudents.filter(s =>
    s.student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.student.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col w-full h-full animate-in fade-in duration-300">

      {/* ── Compact Header ────────────────────────────────────────────────── */}
      <div className="shrink-0 px-1 pt-1 pb-4">
        {/* Room + stats row */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 text-primary mb-0.5">
              <QrCode size={12} />
              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Live Gateway</span>
            </div>
            <h2 className="text-on-surface text-sm font-bold truncate">{roomName}</h2>
          </div>
          {/* Live stats chips */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex flex-col items-center px-3 py-1.5 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
              <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest leading-none">Inside</span>
              <span className="text-base font-black text-emerald-600 leading-tight">{insideStudentIds.size}</span>
            </div>
            <div className="flex flex-col items-center px-3 py-1.5 bg-primary/8 rounded-2xl border border-primary/15">
              <span className="text-[8px] font-black text-primary uppercase tracking-widest leading-none">Total</span>
              <span className="text-base font-black text-primary leading-tight">{totalTodayStudentIds.size}</span>
            </div>
          </div>
        </div>

        {/* ── Tab Bar ─────────────────────────────────────────────────────── */}
        <div className="flex bg-surface-container-low rounded-2xl p-1 border border-outline-variant/10">
          {[
            { id: "scan" as TabMode, label: "Scan QR", icon: <QrCode size={13} /> },
            { id: "search" as TabMode, label: "Manual", icon: <Search size={13} /> },
            { id: "feed" as TabMode, label: "Activity", icon: <Activity size={13} />, badge: todaySessions.length },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
                activeTab === tab.id
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant hover:text-on-surface"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge != null && tab.badge > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 bg-primary text-white text-[8px] font-black rounded-full flex items-center justify-center px-1">
                  {tab.badge > 99 ? "99+" : tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab Content ────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar">

        {/* ── SCAN TAB ──────────────────────────────────────────────────── */}
        {activeTab === "scan" && (
          <div className="flex flex-col items-center gap-4 pb-6 animate-in fade-in duration-200">

            {/* Camera viewport */}
            <div className="relative w-full max-w-[320px] aspect-square rounded-[2.5rem] overflow-hidden border-2 border-outline-variant/20 shadow-2xl shadow-black/10 bg-surface-container-lowest">
              {loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-3 z-10">
                  <RefreshCw size={28} className="text-primary animate-spin" />
                  <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Initializing camera...</span>
                </div>
              )}
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

              {/* Viewfinder HUD */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-48 h-48 relative">
                  {/* Corner brackets */}
                  {[
                    "top-0 left-0 border-t-4 border-l-4 rounded-tl-2xl",
                    "top-0 right-0 border-t-4 border-r-4 rounded-tr-2xl",
                    "bottom-0 left-0 border-b-4 border-l-4 rounded-bl-2xl",
                    "bottom-0 right-0 border-b-4 border-r-4 rounded-br-2xl",
                  ].map((cls, i) => (
                    <div key={i} className={`absolute w-7 h-7 border-primary ${cls}`} />
                  ))}
                  {/* Scanning beam */}
                  {!scanning && (
                    <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent opacity-90 shadow-[0_0_12px_rgba(79,70,229,0.8)] animate-scan" />
                  )}
                </div>
              </div>

              {/* Processing overlay */}
              {scanning && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/30 backdrop-blur-sm z-20">
                  <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-2xl">
                    <RefreshCw size={28} className="animate-spin text-primary" />
                  </div>
                  <span className="mt-3 text-[10px] font-black text-white uppercase tracking-widest">Processing...</span>
                </div>
              )}
            </div>

            {/* Scan result card */}
            {lastScanned ? (
              <div className={`w-full max-w-[320px] border rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300 shadow-sm ${
                lastScanned.action === "check_out" ? "bg-blue-50 border-blue-200" : "bg-emerald-50 border-emerald-200"
              }`}>
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white shadow-lg shrink-0 ${
                  lastScanned.action === "check_out" ? "bg-blue-500" : "bg-emerald-500"
                }`}>
                  {lastScanned.action === "check_out" ? <LogOut size={20} /> : <LogIn size={20} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[9px] font-black uppercase tracking-widest ${
                    lastScanned.action === "check_out" ? "text-blue-600" : "text-emerald-600"
                  }`}>
                    {lastScanned.action === "check_out" ? "✓ Checked Out" : "✓ Checked In"}
                  </p>
                  <h4 className="text-on-surface text-sm font-bold truncate">{lastScanned.name}</h4>
                  <p className="text-[10px] text-secondary truncate">{lastScanned.email}</p>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-[320px] bg-surface-container-low border border-outline-variant/10 rounded-2xl p-4 flex items-center gap-3">
                <div className="w-11 h-11 bg-surface-container rounded-xl flex items-center justify-center text-outline shrink-0">
                  <Camera size={22} />
                </div>
                <div>
                  <p className="text-xs font-bold text-on-surface">Point camera at QR code</p>
                  <p className="text-[10px] text-secondary mt-0.5">Scanning for student credentials...</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SEARCH TAB ────────────────────────────────────────────────── */}
        {activeTab === "search" && (
          <div className="flex flex-col gap-3 pb-6 animate-in fade-in duration-200">
            {/* Search input */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-outline" size={16} />
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-3.5 pl-11 pr-4 text-sm text-on-surface outline-none focus:border-primary/50 transition-all placeholder:text-outline"
              />
              {searchQuery && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary uppercase">
                  {filteredResults.length} found
                </span>
              )}
            </div>

            {/* Student list */}
            {loadingStudents ? (
              <div className="flex flex-col items-center gap-3 py-16 opacity-60">
                <RefreshCw size={24} className="animate-spin text-secondary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Loading students...</span>
              </div>
            ) : filteredResults.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-16 opacity-40">
                <UserCircle size={40} className="text-secondary" />
                <span className="text-xs font-bold text-secondary tracking-widest uppercase">No students found</span>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredResults.map(s => {
                  const isInside = insideStudentIds.has(s.student.id);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all ${
                        isInside
                          ? "bg-emerald-50/60 border-emerald-200"
                          : "bg-surface-container-lowest border-outline-variant/10 hover:bg-surface-container-low"
                      }`}
                    >
                      {/* Avatar */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isInside ? "bg-emerald-100 text-emerald-600" : "bg-surface-container text-secondary"
                      }`}>
                        <User size={18} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-on-surface truncate">{s.student.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                            Seat {s.seat_number || "—"}
                          </span>
                          {isInside && (
                            <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 uppercase tracking-wider">
                              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                              Inside
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action button */}
                      <button
                        disabled={scanning}
                        onClick={() => handleManualMark(s)}
                        className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-1.5 shrink-0 disabled:opacity-50 ${
                          isInside
                            ? "bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200"
                            : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                        }`}
                      >
                        {isInside ? <><LogOut size={11} /> Check Out</> : <><LogIn size={11} /> Check In</>}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── ACTIVITY FEED TAB ─────────────────────────────────────────── */}
        {activeTab === "feed" && (
          <div className="flex flex-col gap-3 pb-6 animate-in fade-in duration-200">
            {/* Feed header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-black text-primary uppercase tracking-[0.3em]">Activity Stream</p>
                <h3 className="text-sm font-bold text-on-surface">Today's Sessions</h3>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[9px] font-black text-secondary uppercase tracking-widest">Live</span>
              </div>
            </div>

            {/* Session entries */}
            {todaySessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-40">
                <Zap size={32} className="text-secondary mb-3" />
                <p className="text-[10px] font-black text-secondary uppercase tracking-widest">No activity yet today</p>
                <p className="text-[9px] text-secondary mt-1">Scan a QR or use manual search</p>
              </div>
            ) : (
              <div className="space-y-2">
                {todaySessions.map((s, i) => {
                  const isInside = !s.check_out_at;
                  const checkInTime = new Date(s.check_in_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
                  const checkOutTime = s.check_out_at
                    ? new Date(s.check_out_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })
                    : null;

                  return (
                    <div
                      key={s.id || i}
                      className={`flex items-center gap-3 p-3.5 rounded-2xl border animate-in slide-in-from-bottom-2 duration-300 ${
                        isInside
                          ? "bg-emerald-50 border-emerald-200"
                          : "bg-surface-container-low border-outline-variant/10"
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isInside ? "bg-emerald-100 text-emerald-600" : "bg-surface-container text-secondary"
                      }`}>
                        {isInside ? <LogIn size={16} /> : <LogOut size={16} />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-bold text-on-surface truncate">{s.student?.name || "Student"}</p>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className={`text-[9px] font-black uppercase tracking-wider ${isInside ? "text-emerald-600" : "text-secondary"}`}>
                            In {checkInTime}
                          </span>
                          {checkOutTime && (
                            <>
                              <span className="text-[9px] text-outline">·</span>
                              <span className="text-[9px] font-black uppercase tracking-wider text-secondary">
                                Out {checkOutTime}
                              </span>
                            </>
                          )}
                        </div>
                      </div>

                      {isInside ? (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                      ) : (
                        <span className="text-[8px] font-black text-secondary uppercase tracking-widest shrink-0">Done</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── CSS ─────────────────────────────────────────────────────────────── */}
      <style jsx global>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          position: absolute;
          animation: scan 2.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
