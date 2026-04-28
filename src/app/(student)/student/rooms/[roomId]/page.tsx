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
import { Loader2 } from "lucide-react";
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
  const supabase = createClient();

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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setStudentId(user.id);
      const { data: subData, error: subError } = await supabase
        .from("subscriptions")
        .select(`*, rooms (*), student:profiles(id, name, email, phone)`)
        .eq("room_id", roomId)
        .eq("student_id", user.id)
        .single();
      if (subError) throw subError;
      setSubscription(subData);
      setRoom(subData.rooms);
      if (subData.student?.name) setStudentName(subData.student.name);
      const { data: logsData } = await supabase
        .from("attendance_logs")
        .select("*")
        .eq("room_id", roomId)
        .eq("student_id", user.id)
        .order("date", { ascending: false });
      const attendanceLogs = logsData || [];
      setLogs(attendanceLogs);
      calculateStreaks(attendanceLogs);
    } catch {
      toast.error("Could not load room details");
    } finally {
      setLoading(false);
    }
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
    const scannedVersion =
      versionStr && versionStr.startsWith("v")
        ? parseInt(versionStr.substring(1))
        : 0;
    if (scannedRoomId !== roomId) {
      toast.error("Wrong QR code — this is for a different room.");
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
      if (!position) {
        toast.error("Location check needed for check-in");
        setLoading(false);
        return;
      }
      const res = await fetch("/api/student/attendance/check-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId,
          latitude: position.latitude,
          longitude: position.longitude,
          version: scannedVersion,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(data.message || "Attendance marked!");
        await fetchData();
      } else {
        toast.error(data.error || "Check-in failed");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
      setShowScanner(false);
    }
  };

  if (loading && !room) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading room...
        </span>
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
  const expiresIn = differenceInDays(
    parseISO(subscription.end_date),
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
        {/* ── Fixed: Desktop Header + Segmented Tabs ─────────────────────── */}
        <div className="sticky-page-header pt-14 md:pt-0 shrink-0">
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
                <div className="bg-inverse-surface text-inverse-on-surface px-4 py-3 rounded-lg flex items-center justify-between relative overflow-hidden">
                  <div className="flex flex-col gap-0.5">
                    <h2 className="font-headline font-medium leading-tight text-base">
                      Mark Attendance
                    </h2>
                    <span className="text-[8px] uppercase tracking-widest opacity-60">
                      Scan the QR at room entry
                    </span>
                  </div>
                  <button
                    disabled={loading}
                    onClick={startCheckIn}
                    className="bg-primary hover:opacity-90 text-white py-1.5 px-3 rounded-full flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 shrink-0"
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: "14px",
                        fontVariationSettings: "'FILL' 1",
                      }}
                    >
                      qr_code_scanner
                    </span>
                    <span className="text-[8px] uppercase font-bold tracking-widest">
                      {loading ? "Checking..." : "Scan QR"}
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
                      Seat {subscription?.seat_number || "—"}
                    </p>
                  </div>
                  <div className="w-px h-6 bg-outline-variant/30" />
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] uppercase tracking-widest text-secondary/70 font-bold">
                      Membership
                    </span>
                    <p className="text-xs font-bold text-on-surface mt-0.5">
                      {format(parseISO(subscription.start_date), "dd MMM")} —{" "}
                      {format(parseISO(subscription.end_date), "dd MMM")}
                    </p>
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

              {/* Right Column — Calendar */}
              <div>
                <div className="bg-surface-container-lowest p-5 rounded-2xl shadow-sm border border-outline-variant/10">
                  <div className="flex justify-between items-center mb-5">
                    <h3 className="font-headline leading-tight text-base font-medium">
                      Attendance Record
                    </h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentMonth(subDays(monthStart, 1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          chevron_left
                        </span>
                      </button>
                      <button
                        onClick={() =>
                          setCurrentMonth(
                            new Date(
                              currentMonth.getFullYear(),
                              currentMonth.getMonth() + 1,
                              1,
                            ),
                          )
                        }
                        className="w-8 h-8 flex items-center justify-center rounded-full border border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                      >
                        <span
                          className="material-symbols-outlined"
                          style={{ fontSize: "16px" }}
                        >
                          chevron_right
                        </span>
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-7 gap-y-3 justify-items-center mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                      <span
                        key={d}
                        className="text-[9px] font-bold text-secondary/50 uppercase tracking-widest"
                      >
                        {d}
                      </span>
                    ))}
                    {Array.from({ length: leadingEmpties }).map((_, i) => (
                      <div key={`e-${i}`} className="w-8 h-8" />
                    ))}
                    {calendarDays.map((day, i) => {
                      const attended = isAttended(day),
                        today = isToday(day);
                      return (
                        <div
                          key={i}
                          className={`w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all ${attended ? "bg-tertiary text-white shadow-sm" : today ? "border-2 border-primary text-primary font-extrabold" : "text-on-surface/40"}`}
                        >
                          {format(day, "d")}
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-5 flex justify-center border-t border-outline-variant/10 pt-3">
                    <span className="text-[10px] uppercase tracking-widest text-secondary/60 font-bold">
                      {format(currentMonth, "MMMM yyyy")}
                    </span>
                  </div>
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
