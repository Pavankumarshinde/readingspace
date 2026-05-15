"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import QRScanner from "@/components/student/QRScanner";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameDay,
  subDays,
  isToday,
  differenceInDays,
  parseISO,
  getDay,
} from "date-fns";
import { Loader2, LogIn, LogOut, CreditCard } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { StudentRoomHeader } from "@/components/student/StudentHeader";
import RoomChat from "@/components/shared/RoomChat";
import { useRoomPresence } from "@/hooks/useRoomPresence";

export default function RoomDetail({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = use(params);
  const router = useRouter();
  const [showScanner, setShowScanner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "chats">("overview");
  const [unreadCount, setUnreadCount] = useState(0);
  const [studentId, setStudentId] = useState<string>("");
  const [studentName, setStudentName] = useState<string>("Student");
  const [subscription, setSubscription] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAccessQR, setShowAccessQR] = useState(false);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [installments, setInstallments] = useState<any[]>([]);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [paymentIsActive, setPaymentIsActive] = useState(false);
  const [effectiveExpiry, setEffectiveExpiry] = useState<string | null>(null);
  const [planStart, setPlanStart] = useState<string | null>(null);
  const [planEnd, setPlanEnd] = useState<string | null>(null);
  // Sessions
  const [sessions, setSessions] = useState<any[]>([]);
  const [openSession, setOpenSession] = useState<any>(null); // current open session
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null); // YYYY-MM-DD for histogram filter
  const [calendarFilter, setCalendarFilter] = useState<"day" | "month">("month");
  const supabase = createClient();

  const fetchInstallments = async () => {
    setLoadingInstallments(true);
    try {
      const res = await fetch(`/api/student/installments?roomId=${roomId}`);
      const data = await res.json();
      if (res.ok) {
        setInstallments(data.installments || []);
        // Use computed payment status from API
        if (data.paymentStatus) {
          setPaymentIsActive(data.paymentStatus.isActive);
          setEffectiveExpiry(data.paymentStatus.effectiveExpiry);
          setPlanStart(data.paymentStatus.planStart);
          setPlanEnd(data.paymentStatus.planEnd);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoadingInstallments(false); }
  };

  const fetchSessions = async (monthStr?: string) => {
    setLoadingSessions(true);
    try {
      const m = monthStr || format(currentMonth, "yyyy-MM");
      // Always fetch today's sessions separately to get accurate open-session state
      const todayIST = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
      const todayMonth = format(new Date(), "yyyy-MM");

      // Fetch the requested month
      const res = await fetch(`/api/student/attendance/sessions?roomId=${roomId}&month=${m}`);
      const data = await res.json();
      if (res.ok) {
        const s = data.sessions || [];
        setSessions(s);
        // Find open session — today's session with no check-out
        const open = s.find((sess: any) => sess.date === todayIST && !sess.check_out_at);
        setOpenSession(open || null);
      }

      // If the requested month is not today's month, also fetch today separately
      // to ensure openSession state is always accurate
      if (m !== todayMonth) {
        const todayRes = await fetch(`/api/student/attendance/sessions?roomId=${roomId}&month=${todayMonth}`);
        const todayData = await todayRes.json();
        if (todayRes.ok) {
          const todaySessions = todayData.sessions || [];
          const open = todaySessions.find((sess: any) => sess.date === todayIST && !sess.check_out_at);
          setOpenSession(open || null);
        }
      }
    } catch (err) { console.error(err); }
    finally { setLoadingSessions(false); }
  };

  useEffect(() => {
    if (activeTab === "chats") setUnreadCount(0);
  }, [activeTab]);

  useEffect(() => {
    const chatChannel = supabase
      .channel("chat_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          if (activeTab !== "chats") setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    let attendanceChannel: any;
    if (studentId) {
      attendanceChannel = supabase
        .channel(`attendance_sync_${studentId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "attendance_logs",
            filter: `student_id=eq.${studentId}`,
          },
          async () => {
            const { data } = await supabase
              .from("attendance_logs")
              .select("*")
              .eq("room_id", roomId)
              .eq("student_id", studentId)
              .order("date", { ascending: false });
            if (data) {
              setLogs(data);
              calculateStreaks(data);
            }
          },
        )
        .subscribe();
    }
    return () => {
      supabase.removeChannel(chatChannel);
      if (attendanceChannel) supabase.removeChannel(attendanceChannel);
    };
  }, [roomId, activeTab, studentId, supabase]);

  const { onlineCount, onlineUsers, isOnline } = useRoomPresence(roomId, {
    id: studentId,
    name: studentName,
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setStudentId(user.id);
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select(`*, rooms (*), student:profiles(id, name, email, phone)`)
        .eq("room_id", roomId).eq("student_id", user.id).single();
      if (subError) throw subError;
      setSubscription(subData);
      setRoom(subData.rooms);
      if (subData.student?.name) setStudentName(subData.student.name);
      const { data: logsData } = await supabase
        .from("attendance_logs").select("*")
        .eq("room_id", roomId).eq("student_id", user.id)
        .order("date", { ascending: false });
      const attendanceLogs = logsData || [];
      setLogs(attendanceLogs);
      calculateStreaks(attendanceLogs);
      // Fetch sessions for current month via dedicated function
      const m = format(new Date(), "yyyy-MM");
      await fetchSessions(m);
    } catch { toast.error("Could not load room details"); }
    finally { setLoading(false); }
  };

  const calculateStreaks = (attendanceLogs: any[]) => {
    if (attendanceLogs.length === 0) {
      setStreak(0);
      setBestStreak(0);
      return;
    }
    const uniqueDates = Array.from(new Set(attendanceLogs.map((l) => l.date)))
      .sort()
      .reverse();
    let current = 0,
      best = 0,
      tempStreak = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    const yesterday = format(subDays(new Date(), 1), "yyyy-MM-dd");
    const hasToday = uniqueDates.includes(today),
      hasYesterday = uniqueDates.includes(yesterday);
    if (hasToday || hasYesterday) {
      let checkDate = hasToday ? new Date() : subDays(new Date(), 1);
      for (let i = 0; i < uniqueDates.length; i++) {
        const dateStr = format(checkDate, "yyyy-MM-dd");
        if (uniqueDates.includes(dateStr)) {
          current++;
          checkDate = subDays(checkDate, 1);
        } else break;
      }
    }
    setStreak(current);
    uniqueDates.forEach((date, index) => {
      if (index === 0) {
        tempStreak = 1;
      } else {
        const diff = differenceInDays(
          parseISO(uniqueDates[index - 1]),
          parseISO(date),
        );
        if (diff === 1) {
          tempStreak++;
        } else {
          best = Math.max(best, tempStreak);
          tempStreak = 1;
        }
      }
    });
    setBestStreak(Math.max(best, tempStreak));
  };

  useEffect(() => {
    fetchData();
    fetchInstallments(); // Load installments & compute real active/expired status on page load
    // Request location permission proactively on page load
    import("@/lib/utils/permissions").then(({ requestLocationPermission }) => {
      requestLocationPermission();
    });
  }, [roomId]);

  const startCheckIn = async () => {
    if (room.latitude && room.longitude) {
      setLoading(true);
      try {
        try {
          const { Geolocation } = await import("@capacitor/geolocation");
          const p = await Geolocation.checkPermissions();
          if (p.location !== "granted") await Geolocation.requestPermissions();
        } catch {}
        if (!navigator.geolocation) {
          toast.error("Location needed for check-in");
          setLoading(false);
          return;
        }
        const { getPreciseLocation } = await import("@/lib/utils/geolocation");
        const position = await getPreciseLocation();
        if (!position) {
          toast.error("Location check failed");
          setLoading(false);
          return;
        }
        const { calculateDistance } = await import("@/lib/utils/distance");
        const distance = calculateDistance(
          position.latitude,
          position.longitude,
          room.latitude,
          room.longitude,
        );
        if (distance > (room.radius || 200)) {
          toast.error(
            `You are ${Math.round(distance)}m away. Please come closer to ${room.name}.`,
            { duration: 6000 },
          );
          return;
        }
        setShowScanner(true);
      } catch {
        toast.error("Check-in failed");
      } finally {
        setLoading(false);
      }
    } else {
      setShowScanner(true);
    }
  };

  const handleMarkAttendance = async (scannedValue: string) => {
    const parts = scannedValue.split("|");
    const scannedRoomId = parts[0];
    const versionStr = parts[1];
    const scannedVersion = versionStr && versionStr.startsWith("v") ? parseInt(versionStr.substring(1)) : 0;
    if (scannedRoomId !== roomId) {
      toast.error("Wrong QR code - this is for a different room.");
      return;
    }
    setLoading(true);
    try {
      try {
        const { Geolocation } = await import("@capacitor/geolocation");
        const p = await Geolocation.checkPermissions();
        if (p.location !== "granted") await Geolocation.requestPermissions();
      } catch {}
      const { getPreciseLocation } = await import("@/lib/utils/geolocation");
      const position = await getPreciseLocation();
      if (!position) { toast.error("Location check needed"); setLoading(false); return; }
      const res = await fetch("/api/student/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, latitude: position.latitude, longitude: position.longitude, version: scannedVersion }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.action === "check_out") {
          toast(data.message || "Checked out successfully!", {
            icon: "🚪",
            style: { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" },
          });
          // Immediately clear open session so button shows "Check In" right away
          setOpenSession(null);
        } else {
          toast.success(data.message || "Checked in!");
        }
        // Refresh sessions for currently viewed month AND today's month to get latest state
        const todayMonth = format(new Date(), "yyyy-MM");
        const currentDisplayMonth = format(currentMonth, "yyyy-MM");
        if (currentDisplayMonth !== todayMonth) {
          await fetchSessions(currentDisplayMonth);
        }
        // Always refresh today's month last so openSession is accurate
        await fetchSessions(todayMonth);
      } else {
        toast.error(data.error || "Failed");
      }
    } catch { toast.error("Network error"); }
    finally { setLoading(false); setShowScanner(false); }
  };

  if (loading && !room) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading room...
        </span>
        {/* Installments Modal */}
        {showInstallmentsModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-surface/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div
              className="fixed inset-0"
              onClick={() => setShowInstallmentsModal(false)}
            ></div>
            <div className="bg-surface-container-lowest rounded-3xl w-full max-w-md shadow-2xl border border-outline-variant/10 relative z-10 overflow-hidden flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 zoom-in-95 duration-300">
              <div className="p-5 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-lowest/50 backdrop-blur-md">
                <h2 className="font-headline text-lg font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">payments</span>
                  Payment History
                </h2>
                <button
                  onClick={() => setShowInstallmentsModal(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-surface-container hover:bg-surface-container-high text-on-surface-variant transition-colors"
                >
                  <span className="material-symbols-outlined" style={{ fontSize: "18px" }}>close</span>
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto">
                {loadingInstallments ? (
                  <div className="py-10 flex justify-center">
                    <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  </div>
                ) : installments.length === 0 ? (
                  <div className="text-center py-8 bg-surface-container-lowest border border-outline-variant/5 rounded-2xl">
                    <p className="font-bold text-on-surface-variant text-sm">
                      No payment history found
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {installments.map((inst, i) => (
                      <div
                        key={inst.id}
                        className="p-4 bg-surface-container-low/30 border border-outline-variant/10 rounded-2xl flex justify-between items-center"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-[11px] font-bold text-on-surface uppercase tracking-widest">
                            {format(new Date(inst.start_date), "dd MMM")} - {format(new Date(inst.end_date), "dd MMM, yyyy")}
                          </span>
                          {inst.payment_date && (
                            <span className="text-[10px] text-on-surface-variant/70 font-medium">
                              Paid on {format(new Date(inst.payment_date), "dd MMM, yyyy")}
                            </span>
                          )}
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${
                            inst.status === "paid"
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                              : "bg-rose-50 text-rose-600 border border-rose-100"
                          }`}
                        >
                          {inst.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
  if (!room) return null;

  const monthStart = startOfMonth(currentMonth),
    monthEnd = endOfMonth(currentMonth);
  const calendarDays = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingEmpties = getDay(monthStart);
  const isAttended = (day: Date) =>
    logs.some((l) => isSameDay(parseISO(l.date), day));
  // Use effective expiry from paid installments; fall back to subscription end_date
  const displayStart = planStart || subscription?.start_date || new Date().toISOString();
  const displayExpiry = planEnd || effectiveExpiry || subscription?.end_date || new Date().toISOString();

  const expiresIn = differenceInDays(
    parseISO(displayExpiry),
    new Date(),
  );

  return (
    <>
      {/* Mobile fixed room header */}
      <StudentRoomHeader
        roomName={room.name}
        subtitle={room.description || "Study Zone"}
        expiresIn={expiresIn}
      />

      <div className="page-shell">
        {/* Fixed: Desktop Header + Segmented Tabs */}
        <div className="sticky-page-header pt-[calc(env(safe-area-inset-top,0px)+4.5rem)] md:pt-0 shrink-0">
          <div className="px-4 md:px-8 max-w-5xl mx-auto pt-3 md:pt-5 pb-4">
            {/* Desktop header (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-4 mb-4">
              <button
                onClick={() => router.back()}
                className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "20px" }}
                >
                  arrow_back
                </span>
              </button>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-headline text-on-surface tracking-tight leading-none text-base font-bold">
                    {room.name}
                  </h1>
                  {expiresIn <= 7 && expiresIn >= 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-error/10 text-error rounded-full border border-error/20">
                      <span
                        className="material-symbols-outlined shrink-0"
                        style={{ fontSize: "10px" }}
                      >
                        warning
                      </span>
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {expiresIn === 0
                          ? "Expires Today"
                          : `${expiresIn} days left`}
                      </span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                  {room.description || "Study Zone"}
                </span>
              </div>
            </div>

            {/* Segmented control tabs */}
            <div className="flex p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full max-w-sm mb-0">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex-1 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "overview" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab("chats")}
                className={`flex-1 px-6 py-2 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "chats" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Live Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error text-white text-[9px] font-black flex items-center justify-center rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {unreadCount === 0 && (
                  <span className="absolute top-2 right-4 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={`scroll-area ${activeTab === "chats" ? "px-0 pb-0 max-w-[1400px]" : "px-4 md:px-8 pb-32 md:pb-8 max-w-5xl"} mx-auto w-full`}>
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8 items-start animate-in fade-in duration-300">
              {/* Left Column */}
              <div className="space-y-4">
                {/* Mark Attendance Card */}
                <div className={`px-4 py-3 rounded-lg flex items-center justify-between relative overflow-hidden ${
                  openSession
                    ? "bg-blue-700 text-white"
                    : "bg-inverse-surface text-inverse-on-surface"
                }`}>
                  <div className="flex flex-col gap-0.5">
                    <h2 className="font-headline font-medium leading-tight text-base">
                      {openSession ? "Check Out" : "Check In"}
                    </h2>
                    <span className="text-[8px] uppercase tracking-widest opacity-60">
                      {openSession ? "Scan QR to check out" : "Scan QR at room entry"}
                    </span>
                  </div>
                  <button
                    disabled={loading}
                    onClick={startCheckIn}
                    className={`py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shrink-0 ${
                      openSession
                        ? "bg-white text-blue-700 hover:opacity-90"
                        : "bg-primary text-white hover:opacity-90"
                    }`}
                  >
                    {openSession ? <LogOut size={14} /> : <LogIn size={14} />}
                    <span className="text-[8px] uppercase font-bold tracking-widest">
                      {loading ? "..." : openSession ? "Check Out" : "Check In"}
                    </span>
                  </button>
                </div>

                {/* My Pass Card */}
                <div
                  className="bg-surface-container-lowest p-3 rounded-lg flex items-center justify-between border border-outline-variant/10 shadow-sm cursor-pointer hover:bg-surface-container-low transition-colors"
                  onClick={() => setShowAccessQR(true)}
                >
                  <div className="flex flex-col">
                    <h2 className="font-headline text-base text-on-surface leading-tight font-medium">
                      My Pass
                    </h2>
                    <p className="text-[8px] text-primary font-bold tracking-widest mt-0.5 uppercase">
                      Show to Owner
                    </p>
                  </div>
                  {subscription && (
                    <div className="w-10 h-10 bg-surface-container-low p-1 rounded border border-outline-variant/10 flex items-center justify-center">
                      <QRCodeSVG
                        value={JSON.stringify({
                          studentId: subscription.student_id,
                          type: "access_verify",
                          version: subscription.qr_version || 0,
                        })}
                        size={32}
                        level="L"
                      />
                    </div>
                  )}
                </div>

                {/* Seat + Membership Row */}
                <div className="bg-surface-container-low/50 rounded-xl px-4 py-3 flex justify-between items-center border border-outline-variant/5">
                  <div className="flex flex-col">
                    <span className="text-[8px] uppercase tracking-widest text-secondary/70 font-bold">
                      Your Seat
                    </span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">
                      Seat {subscription?.seat_number || "-"}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-outline-variant/30" />
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] uppercase tracking-widest text-secondary/70 font-bold flex items-center justify-end gap-1">
                      Membership
                      <button
                        onClick={() => {
                          fetchInstallments();
                          setShowInstallmentsModal(true);
                        }}
                        className="w-4 h-4 rounded-full bg-secondary/10 text-secondary flex items-center justify-center hover:bg-secondary/20 transition-colors"
                        title="View Payment History"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "10px", fontWeight: "bold" }}>info</span>
                      </button>
                    </span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">
                      {format(parseISO(displayStart), "dd MMM")} -{" "}
                      {format(parseISO(displayExpiry), "dd MMM")}
                    </p>
                    {/* Active/Expired payment badge */}
                    <span className={`mt-1 self-end text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-sm ${
                      paymentIsActive
                        ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                        : "bg-rose-50 text-rose-600 border border-rose-100"
                    }`}>
                      {paymentIsActive ? "Active" : "Expired"}
                    </span>
                  </div>
                </div>

                {/* Streak Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3 border border-outline-variant/10 shadow-sm">
                    <div className="bg-primary/10 w-9 h-9 flex items-center justify-center rounded-full shrink-0">
                      <span
                        className="material-symbols-outlined text-primary"
                        style={{
                          fontSize: "18px",
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        local_fire_department
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] uppercase tracking-wider text-secondary/60 font-bold">
                        Day Streak
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {streak} {streak === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>
                  <div className="bg-surface-container-lowest p-4 rounded-xl flex items-center gap-3 border border-outline-variant/10 shadow-sm">
                    <div className="bg-secondary/10 w-9 h-9 flex items-center justify-center rounded-full shrink-0">
                      <span
                        className="material-symbols-outlined text-secondary"
                        style={{
                          fontSize: "18px",
                          fontVariationSettings: "'FILL' 1",
                        }}
                      >
                        emoji_events
                      </span>
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-[8px] uppercase tracking-wider text-secondary/60 font-bold">
                        Best Streak
                      </span>
                      <p className="text-xs font-bold text-on-surface">
                        {bestStreak} {bestStreak === 1 ? "Day" : "Days"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column - Calendar + Sessions + Histogram */}
              <div className="space-y-4">
                {/* Calendar */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-headline leading-tight text-base font-medium">
                      Attendance Record
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          const prev = subDays(monthStart, 1);
                          setCurrentMonth(prev);
                          fetchSessions(format(prev, "yyyy-MM"));
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_left</span>
                      </button>
                      <button
                        onClick={() => {
                          const next = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
                          setCurrentMonth(next);
                          fetchSessions(format(next, "yyyy-MM"));
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: "16px" }}>chevron_right</span>
                      </button>
                    </div>
                  </div>

                  {/* Day / Month filter pills */}
                  <div className="flex gap-1 p-1 bg-surface-container-low rounded-xl mb-4">
                    {(["day", "month"] as const).map((f) => (
                      <button
                        key={f}
                        onClick={() => {
                          setCalendarFilter(f);
                          if (f === "month") setSelectedDay(null);
                          else setSelectedDay(format(new Date(), "yyyy-MM-dd"));
                        }}
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                          calendarFilter === f
                            ? "bg-white shadow-sm text-primary"
                            : "text-on-surface/40 hover:text-on-surface"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-y-3 justify-items-center mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span key={d} className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest">{d}</span>
                    ))}
                    {Array.from({ length: leadingEmpties }).map((_, i) => (
                      <div key={`e-${i}`} className="w-8 h-8" />
                    ))}
                    {calendarDays.map((day, i) => {
                      const attended = isAttended(day), today = isToday(day);
                      const dayStr = format(day, "yyyy-MM-dd");
                      const isSelected = selectedDay === dayStr;
                      return (
                        <div key={i}
                          onClick={() => {
                            setCalendarFilter("day");
                            setSelectedDay(isSelected ? null : dayStr);
                          }}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all cursor-pointer ${
                            isSelected ? "ring-2 ring-primary ring-offset-1 scale-110" : ""
                          } ${attended ? "bg-tertiary text-white shadow-sm" : today ? "border-2 border-primary text-primary font-extrabold" : "text-on-surface/40 hover:bg-surface-container-low"}`}>
                          {format(day, "d")}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex justify-center border-t border-outline-variant/10 pt-3">
                    <span className="text-[10px] uppercase tracking-widest text-secondary/60 font-bold">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                  </div>
                </div>

                {/* Busy Hours — SVG Line+Dot Graph */}
                {(() => {
                  const filteredSessions = selectedDay
                    ? sessions.filter(s => s.date === selectedDay)
                    : sessions;
                  const hourCounts = Array(24).fill(0);
                  filteredSessions.forEach((s) => {
                    const start = new Date(s.check_in_at);
                    const end = s.check_out_at ? new Date(s.check_out_at) : new Date();
                    if (isNaN(start.getTime()) || isNaN(end.getTime())) return;
                    const startHour = start.getHours();
                    let endHour = end.getHours();
                    if (end.getDate() !== start.getDate() || end.getMonth() !== start.getMonth()) endHour = 23;
                    if (startHour <= endHour) {
                      for (let h = startHour; h <= endHour; h++) {
                        if (h >= 0 && h < 24) hourCounts[h]++;
                      }
                    }
                  });
                  const maxCount = Math.max(...hourCounts, 1);
                  const allHours = Array.from({ length: 24 }, (_, i) => i);
                  const xLabels = ["12A","1A","2A","3A","4A","5A","6A","7A","8A","9A","10A","11A","12P","1P","2P","3P","4P","5P","6P","7P","8P","9P","10P","11P"];
                  const periodLabel = selectedDay ? format(parseISO(selectedDay), "dd MMM") : format(currentMonth, "MMM yyyy");
                  // SVG geometry
                  const svgW = 24 * 28; const svgH = 100;
                  const padL = 24; const padB = 24; const padT = 16; const padR = 6;
                  const plotW = svgW - padL - padR; const plotH = svgH - padT - padB;
                  const pts = allHours.map((h, i) => ({
                    x: padL + (i / 23) * plotW,
                    y: padT + plotH - (hourCounts[h] / maxCount) * plotH,
                    count: hourCounts[h],
                  }));
                  const pathD = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
                  return (
                    <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Busy Hours</h3>
                        <div className="flex items-center gap-2">
                          {selectedDay && (
                            <button onClick={() => { setSelectedDay(null); setCalendarFilter("month"); }} className="text-[8px] font-black text-primary uppercase bg-primary/10 px-2 py-0.5 rounded-full hover:bg-primary/20 transition-colors">Clear</button>
                          )}
                          <span className="text-[9px] text-secondary/60 font-bold uppercase">{periodLabel}</span>
                        </div>
                      </div>
                      <div className="overflow-x-auto custom-scrollbar pb-2">
                        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full min-w-[320px]" style={{ height: "auto", maxHeight: "140px" }}>
                          {/* Y-axis label */}
                          <text x="2" y={padT + plotH / 2} fontSize="6" fill="#94a3b8" textAnchor="middle"
                            transform={`rotate(-90, 8, ${padT + plotH / 2})`} fontWeight="700" letterSpacing="1">Sessions</text>
                          {/* Grid lines */}
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
                                <text x={p.x} y={p.y - 5} fontSize="5.5" fill="#1e40af" textAnchor="middle" fontWeight="700">{p.count}</text>
                              )}
                            </g>
                          ))}
                          {/* X-axis labels */}
                          {allHours.map((h, i) => (
                            <text key={h} x={pts[i].x} y={svgH - 6} fontSize="5.5" fill="#94a3b8"
                              textAnchor="middle" fontWeight="700">{xLabels[i]}</text>
                          ))}
                        </svg>
                      </div>
                    </div>
                  );
                })()}

                {/* Sessions History Table - filtered by selectedDay or full month */}
                <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
                  <div className="px-4 pt-4 pb-2 flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-widest text-on-surface-variant">Check-In / Check-Out Log</h3>
                      {selectedDay && <p className="text-[9px] text-primary font-bold mt-0.5">{format(parseISO(selectedDay), "dd MMMM yyyy")}</p>}
                    </div>
                    {loadingSessions && <div className="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />}
                  </div>
                  {(() => {
                    const filteredSessions = selectedDay
                      ? sessions.filter(s => s.date === selectedDay)
                      : sessions;
                    return filteredSessions.length === 0 ? (
                      <div className="px-4 pb-4 text-center text-[10px] text-secondary/50 font-bold uppercase">
                        {selectedDay ? "No sessions on this day" : "No sessions this month"}
                      </div>
                    ) : (
                      <div className="divide-y divide-outline-variant/10 max-h-72 overflow-y-auto">
                        {filteredSessions.slice(0, 50).map((s, i) => {
                          const checkIn = new Date(s.check_in_at);
                          const checkOut = s.check_out_at ? new Date(s.check_out_at) : null;
                          const durationMin = checkOut ? Math.round((checkOut.getTime() - checkIn.getTime()) / 60000) : null;
                          const isAuto = s.is_auto_checkout;
                          const isOpen = !s.check_out_at;
                          const timeOpts: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Asia/Kolkata" };
                          const checkInStr = checkIn.toLocaleTimeString("en-IN", timeOpts);
                          const checkOutStr = checkOut ? checkOut.toLocaleTimeString("en-IN", timeOpts) : null;
                          const durationLabel = durationMin !== null
                            ? durationMin < 60
                              ? `${durationMin}m`
                              : `${Math.floor(durationMin / 60)}h ${durationMin % 60}m`
                            : null;
                          return (
                            <div key={s.id || i} className="px-4 py-3 flex items-start gap-3">
                              {/* Icon */}
                              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                                isOpen ? "bg-emerald-50 text-emerald-600" :
                                isAuto ? "bg-orange-50 text-orange-500" :
                                "bg-blue-50 text-blue-600"
                              }`}>
                                <span className="material-symbols-outlined" style={{ fontSize: "14px", fontVariationSettings: "'FILL' 1" }}>
                                  {isOpen ? "login" : "logout"}
                                </span>
                              </div>

                              {/* Date + Times */}
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-on-surface leading-tight">
                                  {format(checkIn, "dd MMM, EEE")}
                                </p>
                                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                  {/* Check-in time */}
                                  <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-on-surface/70">
                                    <span className="material-symbols-outlined text-emerald-500" style={{ fontSize: "10px" }}>login</span>
                                    {checkInStr}
                                  </span>
                                  {/* Arrow + Check-out */}
                                  {checkOutStr && (
                                    <>
                                      <span className="text-[9px] text-outline/40">→</span>
                                      <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-on-surface/70">
                                        <span className="material-symbols-outlined text-blue-500" style={{ fontSize: "10px" }}>logout</span>
                                        {checkOutStr}
                                      </span>
                                    </>
                                  )}
                                </div>
                                {/* Duration row */}
                                {durationLabel && (
                                  <p className="text-[9px] text-secondary/60 font-medium mt-0.5">
                                    {durationLabel} session
                                    {isAuto && <span className="ml-1 text-orange-500 font-bold">(auto-closed)</span>}
                                  </p>
                                )}
                              </div>

                              {/* Status badge */}
                              <div className="shrink-0 mt-0.5">
                                {isOpen ? (
                                  <span className="text-[8px] font-black text-emerald-600 uppercase bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">Inside</span>
                                ) : isAuto ? (
                                  <span className="text-[8px] font-black text-orange-500 uppercase bg-orange-50 border border-orange-100 px-2 py-0.5 rounded-full">Auto</span>
                                ) : (
                                  <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">Done</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {activeTab === "chats" && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
              <RoomChat
                roomId={room.id}
                currentUserId={studentId}
                currentUserName={studentName}
                currentUserType="student"
                onlineUsers={onlineUsers}
                isOnline={isOnline}
              />
            </div>
          )}
        </div>
      </div>

      {/* My Pass Modal */}
      {showAccessQR && subscription && (
        <div className="fixed inset-0 z-[100] bg-on-surface/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="printable-pass relative w-full max-w-[320px] bg-surface-container-lowest rounded-[32px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col items-center p-6 border border-outline-variant/10">
            <div className="printable-pass-content flex flex-col items-center w-full">
              <div className="text-center space-y-1.5 mb-5">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-full">
                  Official Pass
                </span>
                <h3 className="font-headline text-on-surface pt-1 text-base font-medium">
                  My Access Pass
                </h3>
                <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  {(subscription.student as any)?.name}
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm mb-5">
                <QRCodeSVG
                  value={JSON.stringify({
                    studentId: subscription.student_id,
                    type: "access_verify",
                    version: subscription.qr_version || 0,
                  })}
                  size={160}
                  level="H"
                  includeMargin
                />
              </div>

              <div className="w-full space-y-3">
                <div className="flex flex-col gap-2 p-3.5 bg-surface-container-low/30 rounded-2xl border border-outline-variant/10">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Reading Space
                    </span>
                    <span className="text-on-surface text-right truncate pl-4">
                      {room.name}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Seat
                    </span>
                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                      #{subscription.seat_number}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Email
                    </span>
                    <span className="text-on-surface truncate pl-4">
                      {(subscription.student as any)?.email || "N/A"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Phone
                    </span>
                    <span className="text-on-surface">
                      {(subscription.student as any)?.phone || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full py-2.5 px-3 bg-secondary/5 rounded-xl border border-secondary/10 mt-5">
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest text-center leading-relaxed">
                  Show this to the room manager.
                  <br />
                  Valid membership required.
                </p>
              </div>
            </div>

            <div className="w-full mt-5 flex gap-2 print:hidden">
              <button
                onClick={() => setShowAccessQR(false)}
                className="flex-1 py-3 bg-surface-container text-on-surface text-[11px] font-bold rounded-2xl hover:bg-surface-container-high transition-colors uppercase tracking-widest"
              >
                Close
              </button>
              <button
                onClick={() => window.print()}
                className="flex-[1.5] py-3 bg-on-surface text-surface text-[11px] font-bold rounded-2xl hover:-translate-y-0.5 transition-transform uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-md"
              >
                <span
                  className="material-symbols-outlined"
                  style={{ fontSize: "16px" }}
                >
                  print
                </span>
                Print Pass
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner
          onScan={handleMarkAttendance}
          onClose={() => setShowScanner(false)}
        />
      )}
    </>
  );
}
