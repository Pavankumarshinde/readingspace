"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserQRCodeReader } from "@zxing/library";
import {
  X,
  Camera,
  RefreshCw,
  CheckCircle2,
  UserCircle,
  QrCode,
  Search,
  User,
  Filter,
  CreditCard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";

interface AttendanceScannerProps {
  roomId: string;
  roomName: string;
  onClose: () => void;
}

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

  // New features
  const [viewMode, setViewMode] = useState<"scan" | "search">("scan");
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [todayLogs, setTodayLogs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Fetch students for manual lookup
  useEffect(() => {
    async function fetchStudents() {
      setLoadingStudents(true);
      try {
        const today = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Kolkata",
        }).format(new Date());
        const [{ data: students }, { data: logs }] = await Promise.all([
          supabase
            .from("subscriptions")
            .select(
              `
 id, seat_number, qr_version,
 student:profiles!inner(id, name, email)
 `,
            )
            .eq("room_id", roomId)
            .eq("status", "active"),
          supabase
            .from("attendance_logs")
            .select("student_id, timestamp, student:profiles(name, email)")
            .eq("room_id", roomId)
            .eq("date", today)
            .order("timestamp", { ascending: false }),
        ]);

        setAllStudents(students || []);
        setTodayLogs(logs || []);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } finally {
        setLoadingStudents(false);
      }
    }
    fetchStudents();

    // Real-time listener for today's logs
    const channel = supabase
      .channel("scanner-updates")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "attendance_logs",
          filter: `room_id=eq.${roomId}`,
        },
        async (payload: any) => {
          const newLog = payload.new;
          // Only care if it's today
          const today = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Asia/Kolkata",
          }).format(new Date());
          if (newLog.date !== today) return;

          // Fetch student details for the feed
          const { data: student } = await supabase
            .from("profiles")
            .select("name, email")
            .eq("id", newLog.student_id)
            .single();

          const expandedLog = { ...newLog, student };
          setTodayLogs((prev) => {
            if (prev.some((l) => l.student_id === newLog.student_id))
              return prev;
            return [expandedLog, ...prev];
          });

          // If we manually marked someone, we already show the success card,
          // but this ensures the button updates immediately too.
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, supabase]);

  useEffect(() => {
    let codeReader: BrowserQRCodeReader | null = null;
    let controls: any = null;

    async function startScanner() {
      try {
        try {
          const { Camera } = await import("@capacitor/camera");
          const p = await Camera.checkPermissions();
          if (p.camera !== "granted") {
            await Camera.requestPermissions();
          }
        } catch (e) {
          console.log(
            "Capacitor Camera plugin not active/supported on this platform, falling back to web",
          );
        }

        codeReader = new BrowserQRCodeReader();
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoInputDevices = devices.filter(
          (device) => device.kind === "videoinput",
        );

        if (videoInputDevices.length === 0) {
          toast.error("No camera found");
          onClose();
          return;
        }

        // Prefer back camera
        const backCamera =
          videoInputDevices.find((d) =>
            d.label.toLowerCase().includes("back"),
          ) || videoInputDevices[0];

        controls = await codeReader.decodeFromVideoDevice(
          backCamera.deviceId,
          videoRef.current!,
          async (result, error) => {
            if (!result || scannedRef.current) return;

            scannedRef.current = true;
            setScanning(true);

            try {
              const payload = JSON.parse(result.getText());

              if (payload.type !== "access_verify") {
                throw new Error("Invalid QR Code type");
              }

              const res = await fetch("/api/manager/attendance/scan", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  studentId: payload.studentId,
                  roomId: roomId,
                  version: payload.version || 0,
                }),
              });

              const data = await res.json();

              if (res.ok) {
                toast.success(`Attendance marked: ${data.student.name}`);
                setLastScanned(data.student);

                // Manually prepend to the list for instant UI feedback
                const localLog = {
                  student_id: payload.studentId,
                  timestamp: new Date().toISOString(),
                  student: data.student,
                };
                setTodayLogs((prev) => {
                  if (prev.some((l) => l.student_id === localLog.student_id))
                    return prev;
                  return [localLog, ...prev];
                });

                // Wait 2 seconds before allowing next scan
                setTimeout(() => {
                  scannedRef.current = false;
                  setScanning(false);
                }, 2000);
              } else if (res.status === 409) {
                toast(data.error || "Already marked today", {
                  icon: "⚠️",
                  style: {
                    borderRadius: "10px",
                    background: "#fff8f0",
                    color: "#9B4000",
                    border: "1px solid #ffdbcb",
                    fontSize: "12px",
                    fontWeight: "bold",
                  },
                });
                scannedRef.current = false;
                setScanning(false);
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
      if (controls)
        try {
          controls.stop();
        } catch (e) {}
      if (codeReader)
        try {
          codeReader.reset();
        } catch (e) {}
    };
  }, [roomId]);

  const handleManualMark = async (student: any) => {
    if (scanning) return;
    setScanning(true);

    try {
      const res = await fetch("/api/manager/attendance/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.student.id,
          roomId: roomId,
          version: student.qr_version || 0,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success(`Attendance marked: ${data.student.name}`);
        setLastScanned(data.student);

        // Manually prepend to the list for instant UI feedback
        const localLog = {
          student_id: student.student.id,
          timestamp: new Date().toISOString(),
          student: data.student,
        };
        setTodayLogs((prev) => {
          if (prev.some((l) => l.student_id === localLog.student_id))
            return prev;
          return [localLog, ...prev];
        });

        setTimeout(() => setScanning(false), 2000);
      } else if (res.status === 409) {
        toast(data.error || "Already marked today", {
          icon: "⚠️",
          style: {
            borderRadius: "10px",
            background: "#fff8f0",
            color: "#9B4000",
            border: "1px solid #ffdbcb",
            fontSize: "12px",
            fontWeight: "bold",
          },
        });
        setScanning(false);
      } else {
        throw new Error(data.error || "Failed to log attendance");
      }
    } catch (err: any) {
      toast.error(err.message || "Action failed");
      setScanning(false);
    }
  };

  const markedStudentIds = new Set(todayLogs.map((log) => log.student_id));

  const filteredResults = allStudents.filter(
    (s) =>
      s.student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.student.email?.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex flex-col w-full h-full animate-in fade-in slide-in-from-right-4 duration-300">
      {/* Header */}
      <header className="w-full flex flex-col gap-6 md:gap-8 mb-8 shrink-0">
        <div className="flex items-start gap-4">
          <button
            onClick={onClose}
            className="w-10 h-10 md:w-12 md:h-12 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-all shrink-0 mt-1"
          >
            <span
              className="material-symbols-outlined translate-x-0.5 group-active:scale-90 transition-transform"
              style={{ fontSize: "20px" }}
            >
              arrow_back_ios
            </span>
          </button>

          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-primary">
              <QrCode size={18} />
              <span className="text-[10px] font-black uppercase tracking-[.3em]">
                Live Gateway
              </span>
            </div>
            <h2 className="text-on-surface leading-tight text-base font-medium">
              Attendance: {roomName}
            </h2>
            <div className="flex p-1 bg-surface-container-low rounded-xl border border-outline-variant/10 mt-3 w-fit shadow-sm">
              <button
                onClick={() => setViewMode("scan")}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "scan" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-on-surface-variant hover:text-on-surface hover:bg-white/50"}`}
              >
                Scan QR
              </button>
              <button
                onClick={() => setViewMode("search")}
                className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === "search" ? "bg-primary text-white shadow-lg shadow-primary/20" : "text-on-surface-variant hover:text-on-surface hover:bg-white/50"}`}
              >
                Manual Search
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 min-h-0 pb-6">
        {/* LEFT COLUMN: Main Interaction Viewport */}
        <div className="flex flex-col min-h-0 items-center md:items-stretch w-full overflow-y-auto custom-scrollbar">
          {viewMode === "scan" ? (
            <div className="flex flex-col items-center justify-start md:justify-center h-full w-full py-4">
              <div className="relative w-full aspect-square max-w-[340px] md:max-w-[400px] gap-2 rounded-[3rem] overflow-hidden border border-outline-variant/20 shadow-2xl shadow-primary/5 bg-surface-container-lowest shrink-0">
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface gap-4">
                    <RefreshCw
                      size={32}
                      className="text-primary animate-spin"
                    />
                    <span className="text-[10px] font-black text-secondary uppercase tracking-widest text-center">
                      Initializing Optics...
                    </span>
                  </div>
                )}
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />

                {/* HUD Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-primary/40 rounded-[2rem] relative">
                    {/* Corner Brackets */}
                    <div className="absolute -top-2 -left-2 w-8 h-8 border-t-8 border-l-8 border-primary rounded-tl-2xl" />
                    <div className="absolute -top-2 -right-2 w-8 h-8 border-t-8 border-r-8 border-primary rounded-tr-2xl" />
                    <div className="absolute -bottom-2 -left-2 w-8 h-8 border-b-8 border-l-8 border-primary rounded-bl-2xl" />
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 border-b-8 border-r-8 border-primary rounded-br-2xl" />

                    {/* Scanning Beam */}
                    <div
                      className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent opacity-80 shadow-[0_0_20px_rgba(79,70,229,1)] transition-all duration-500 ${scanning ? "animate-none opacity-0" : "animate-scan"}`}
                    />
                  </div>
                </div>

                {scanning && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-surface/40 backdrop-blur-sm">
                    <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-primary shadow-2xl animate-pulse">
                      <RefreshCw size={40} className="animate-spin" />
                    </div>
                  </div>
                )}
              </div>

              {/* Scanning Feedback relative to scanner */}
              <div className="mt-8 flex flex-col items-center gap-6 w-full max-w-sm shrink-0">
                {lastScanned ? (
                  <div className="w-full bg-emerald-50 border border-emerald-100 rounded-3xl p-5 flex items-center gap-4 animate-in slide-in-from-bottom-5 shadow-sm">
                    <div className="w-14 h-14 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 flex-shrink-0">
                      <CheckCircle2 size={32} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                        Entry Recorded
                      </p>
                      <h4 className="text-on-surface truncate text-base font-medium">
                        {lastScanned.name}
                      </h4>
                      <p className="text-xs font-bold text-secondary truncate">
                        {lastScanned.email}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 text-secondary bg-surface-container-low border border-outline-variant/10 rounded-3xl p-5 w-full">
                    <div className="w-14 h-14 bg-surface-container rounded-2xl flex items-center justify-center text-on-surface-variant">
                      <Camera size={28} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        Position QR Code
                      </p>
                      <p className="text-[10px] font-medium text-secondary mt-1 uppercase tracking-wider">
                        Searching for credentials...
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col min-h-0 w-full">
              <div className="relative mb-4 shrink-0 mt-2">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-outline"
                  size={18}
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant/20 rounded-2xl py-4 pl-12 pr-4 text-on-surface text-sm outline-none focus:border-primary/50 transition-all placeholder:text-outline"
                />
              </div>

              <div className="h-[520px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                {loadingStudents ? (
                  <div className="py-12 flex flex-col items-center gap-3 opacity-60">
                    <RefreshCw
                      size={24}
                      className="animate-spin text-secondary"
                    />
                    <span className="text-[10px] font-black uppercase tracking-widest text-secondary">
                      Fetching database...
                    </span>
                  </div>
                ) : filteredResults.length === 0 ? (
                  <div className="py-12 flex flex-col items-center gap-3 opacity-40">
                    <UserCircle size={48} className="text-secondary" />
                    <span className="text-xs font-bold text-secondary tracking-widest uppercase">
                      No matches found
                    </span>
                  </div>
                ) : (
                  filteredResults.map((s) => {
                    const isMarked = markedStudentIds.has(s.student.id);
                    return (
                      <div
                        key={s.id}
                        className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container-low transition-all group shadow-sm"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-surface-container border border-outline-variant/10 flex items-center justify-center text-secondary group-hover:text-primary group-hover:bg-primary/5 transition-colors shrink-0">
                            <User size={20} />
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-on-surface text-sm truncate uppercase tracking-tight text-base font-medium">
                              {s.student.name}
                            </h5>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-black text-secondary uppercase tracking-widest">
                                Seat {s.seat_number || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          disabled={scanning || isMarked}
                          onClick={() => handleManualMark(s)}
                          className={`px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2 shrink-0 ${
                            isMarked
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-none"
                              : "bg-primary text-white shadow-primary/20 hover:bg-primary/90 hover:shadow-primary/30 disabled:opacity-50"
                          }`}
                        >
                          {isMarked && <CheckCircle2 size={12} />}
                          {isMarked ? "Marked" : "Mark Present"}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ACTIVITY FEED */}
        <div className="flex flex-col min-h-0 bg-surface-container-lowest md:border border border-outline-variant/10 md:rounded-[2.5rem] pt-6 md:p-8">
          <div className="flex items-center justify-between mb-4 md:mb-6 shrink-0 mt-2">
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.3em]">
                Activity Stream
              </span>
              <h4 className="text-on-surface uppercase text-base font-medium">
                Today's Entries
              </h4>
            </div>
            <div className="px-4 py-1.5 bg-primary/10 rounded-xl border border-primary/20">
              <span className="text-xs font-black text-primary">
                {todayLogs.length}
              </span>
            </div>
          </div>

          <div className="h-[520px] overflow-y-auto space-y-3 custom-scrollbar pr-2">
            {todayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 opacity-50 text-center">
                <RefreshCw size={24} className="mb-2 text-secondary" />
                <p className="text-[9px] font-black text-secondary uppercase tracking-widest">
                  Waiting for check-ins...
                </p>
              </div>
            ) : (
              todayLogs.map((log, i) => (
                <div
                  key={log.id || i}
                  className="flex items-center gap-3 bg-surface-container-low p-3 rounded-2xl border border-outline-variant/10 animate-in slide-in-from-right-5 duration-300"
                >
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center border border-emerald-100 shrink-0">
                    <CheckCircle2 size={14} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-on-surface truncate uppercase ">
                      {log.student?.name}
                    </p>
                    <p className="text-[9px] font-bold text-secondary uppercase tracking-tighter">
                      {log.timestamp
                        ? new Date(log.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Just now"}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% {
            top: 0%;
          }
          50% {
            top: 100%;
          }
          100% {
            top: 0%;
          }
        }
        .animate-scan {
          position: absolute;
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  );
}
