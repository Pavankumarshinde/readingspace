"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Pencil,
  MapPin,
  Users,
  Key,
  ScanLine,
  Trash2,
  RotateCw,
  QrCode,
  Info,
  X,
  ShieldCheck,
  Loader2,
  ChevronRight,
  Search,
  Calendar,
  MoreVertical,
  Wifi,
} from "lucide-react";
import Modal from "@/components/ui/Modal";
import QRDisplay from "@/components/manager/QRDisplay";
import AttendanceScanner from "@/components/manager/AttendanceScanner";
import RoomChat from "@/components/shared/RoomChat";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  getDaysInMonth,
  getDay,
  isSameDay,
  addMonths,
  subMonths,
} from "date-fns";
import dynamic from "next/dynamic";
import { useRoomPresence } from "@/hooks/useRoomPresence";

const RoomStudentsTab = dynamic(
  () => import("@/components/manager/RoomStudentsTab"),
  {
    ssr: false,
    loading: () => (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    ),
  },
);

const RoomDashboardTab = dynamic(
  () => import("@/components/manager/RoomDashboardTab"),
  {
    ssr: false,
    loading: () => (
      <div className="py-20 flex justify-center">
        <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
      </div>
    ),
  },
);

export default function ManagerRoomDetail() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [room, setRoom] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "students" | "chats"
  >("dashboard");
  const [unreadCount, setUnreadCount] = useState(0);
  const [managerId, setManagerId] = useState<string>("");
  const [managerName, setManagerName] = useState<string>("Manager");
  const [occupancy, setOccupancy] = useState({ active: 0, total: 0 });

  // ── Sync Unread Count ──────────────────────────────────────────────────
  useEffect(() => {
    if (activeTab === "chats") {
      setUnreadCount(0);
    }
  }, [activeTab]);

  useEffect(() => {
    const channel = supabase
      .channel("chat_notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "room_messages",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          if (activeTab !== "chats") {
            setUnreadCount((prev) => prev + 1);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId, activeTab, supabase]);

  const { onlineCount, onlineUsers, isOnline } = useRoomPresence(roomId, {
    id: managerId,
    name: managerName,
  });

  // Modals
  const [showEditRoom, setShowEditRoom] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [saving, setSaving] = useState(false);

  // Edit form
  const [formData, setFormData] = useState({
    id: null as string | null,
    name: "",
    description: "",
    capacity: 50,
    tier: "standard",
    latitude: null as number | null,
    longitude: null as number | null,
    radius: 200,
  });

  // ── Fetch Room ──────────────────────────────────────────────────────────
  const fetchRoom = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      setManagerId(user.id);

      const { data: profile } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", user.id)
        .single();
      if (profile?.name) setManagerName(profile.name);

      const [roomResponse, occupancyResponse] = await Promise.all([
        supabase.from("rooms").select("*").eq("id", roomId).single(),
        supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("room_id", roomId)
          .eq("status", "active"),
      ]);

      const { data: roomData, error } = roomResponse;
      const { count } = occupancyResponse;

      if (error) throw error;
      setRoom(roomData);

      // Set form data for edit
      setFormData({
        id: roomData.id,
        name: roomData.name,
        description: roomData.description || "",
        capacity: roomData.total_seats || 50,
        tier: roomData.tier || "standard",
        latitude: roomData.latitude,
        longitude: roomData.longitude,
        radius: roomData.radius || 200,
      });

      setOccupancy({ active: count || 0, total: roomData.total_seats || 0 });
    } catch (err) {
      console.error(err);
      toast.error("Failed to load room");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoom();
  }, [roomId]);

  // ── Room Actions ────────────────────────────────────────────────────────
  const handleGetCurrentLocation = async () => {
    try {
      const { Geolocation } = await import("@capacitor/geolocation");
      const p = await Geolocation.checkPermissions();
      if (p.location !== "granted") {
        const req = await Geolocation.requestPermissions();
        if (req.location !== "granted") {
          toast.error("Location access denied");
          return;
        }
      }
    } catch (e) {
      console.log("Capacitor Geolocation not available");
    }

    toast.loading("Capturing precise coordinates...", { id: "geo" });
    const { getPreciseLocation } = await import("@/lib/utils/geolocation");
    const position = await getPreciseLocation();

    if (position) {
      setFormData((prev) => ({
        ...prev,
        latitude: position.latitude,
        longitude: position.longitude,
      }));
      toast.dismiss("geo");
      toast.success(
        `Location anchored with ${Math.round(position.accuracy)}m accuracy`,
      );
    } else {
      toast.dismiss("geo");
      toast.error("Location verification timed out or denied");
    }
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/manager/rooms/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        toast.success("Room updated successfully");
        setShowEditRoom(false);
        fetchRoom();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to update");
      }
    } catch (e) {
      toast.error("Network connection failure");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this room? This will also remove all subscriptions, attendance logs and pending requests.",
      )
    )
      return;
    try {
      const res = await fetch("/api/manager/rooms/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        toast.success("Room deleted");
        router.push("/manager/rooms");
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to delete room");
      }
    } catch (e) {
      toast.error("Network failure");
    }
  };

  const handleRegenerateKey = async () => {
    if (
      !confirm(
        "This will invalidate the current Join Key. Existing members will stay, but new members will need the new key. Proceed?",
      )
    )
      return;
    try {
      const res = await fetch("/api/manager/rooms/regenerate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        toast.success("Join Key rotated successfully");
        fetchRoom();
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to rotate key");
      }
    } catch (e) {
      toast.error("Network failure");
    }
  };

  // ── Security Actions ──────────────────────────────────────────────────
  const handleRegenerateRoomQR = async () => {
    if (
      !confirm(
        "This will invalidate the current Room QR code. All physical prints of the old QR will stop working. Proceed?",
      )
    )
      return;
    try {
      const res = await fetch("/api/manager/rooms/regenerate-qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId }),
      });
      if (res.ok) {
        toast.success("Room QR regenerated successfully");
        fetchRoom(); // Refresh room data to get new version
      } else {
        const err = await res.json();
        toast.error(err.error || "Failed to regenerate");
      }
    } catch (e) {
      toast.error("Network failure");
    }
  };

  // ── Loading State ───────────────────────────────────────────────────────
  if (loading && !room) {
    return (
      <div className="flex flex-col min-h-[60vh] items-center justify-center bg-surface">
        <Loader2 className="w-8 h-8 animate-spin text-primary mb-3" />
        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary/60">
          Loading room...
        </span>
      </div>
    );
  }
  if (!room) return null;

  // Render ──────────────────────────────────────────────────────────────
  if (showScanner) {
    return (
      <div className="page-shell">
        <div className="sticky-page-header px-4 md:px-8 py-3">
          <button
            onClick={() => setShowScanner(false)}
            className="flex items-center gap-2 text-primary font-bold text-sm"
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: "20px" }}
            >
              arrow_back
            </span>
            Back to Room
          </button>
        </div>
        <div className="scroll-area px-4 md:px-8 pb-4 pb-32 md:pb-8 max-w-[1400px] mx-auto w-full">
          <AttendanceScanner
            roomId={room.id}
            roomName={room.name}
            onClose={() => setShowScanner(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="page-shell">
        {/* ── Fixed Page Header: Room name + Actions + Tabs ────────────── */}
        <div className="sticky-page-header px-4 md:px-8 pt-4 pb-4">
          <div className="max-w-[1400px] mx-auto">
            {/* Top Row */}
            <div className="flex items-center justify-between gap-4 mb-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/manager/rooms")}
                  className="w-9 h-9 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-all shrink-0"
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontSize: "18px" }}
                  >
                    arrow_back
                  </span>
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="font-headline text-on-surface tracking-tight leading-none text-base font-bold">
                      {room.name}
                    </h1>
                    <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100">
                      <Wifi size={9} className="animate-pulse" />
                      <span className="text-[9px] font-black uppercase tracking-widest">
                        {onlineCount} Online
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
                    {room.description || "Study Area"}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowEditRoom(true)}
                  className="hidden md:flex w-10 h-10 bg-surface-container-lowest rounded-full items-center justify-center border border-outline-variant/20 hover:bg-surface-container-low transition-colors text-outline hover:text-primary"
                  title="Edit Room"
                >
                  <Pencil size={18} />
                </button>
                <button
                  onClick={handleDeleteRoom}
                  className="hidden md:flex w-10 h-10 bg-surface-container-lowest rounded-full items-center justify-center border border-outline-variant/20 hover:bg-error/10 transition-colors text-outline hover:text-error"
                  title="Delete Room"
                >
                  <Trash2 size={18} />
                </button>
                <div className="relative group md:hidden">
                  <button className="w-10 h-10 bg-surface-container-lowest rounded-full flex items-center justify-center border border-outline-variant/20 text-on-surface-variant">
                    <MoreVertical size={18} />
                  </button>
                  <div className="absolute right-0 top-full mt-2 w-44 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl shadow-2xl opacity-0 -translate-y-2 pointer-events-none group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:pointer-events-auto transition-all z-50 p-2">
                    <button
                      onClick={() => setShowEditRoom(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-on-surface hover:bg-surface-container-low rounded-xl transition-colors uppercase tracking-widest"
                    >
                      <Pencil size={14} className="text-primary" />
                      Edit Room
                    </button>
                    <button
                      onClick={handleDeleteRoom}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-[11px] font-bold text-error hover:bg-error/5 rounded-xl transition-colors uppercase tracking-widest"
                    >
                      <Trash2 size={14} />
                      Delete Room
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Segmented Tabs */}
            <div className="flex p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full">
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`flex-1 px-2 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "dashboard" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab("students")}
                className={`flex-1 px-2 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === "students" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Students
              </button>
              <button
                onClick={() => setActiveTab("chats")}
                className={`flex-1 px-2 md:px-6 py-2 rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-widest transition-all relative ${activeTab === "chats" ? "bg-surface-container-lowest text-primary shadow-sm" : "text-on-surface-variant hover:text-on-surface"}`}
              >
                Live Chat
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-error text-white text-[9px] font-black flex items-center justify-center rounded-full px-1">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
                {unreadCount === 0 && (
                  <span className="absolute top-2 right-3 w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className={`scroll-area ${activeTab === "chats" ? "px-0 pb-0 max-w-[1400px]" : "px-4 md:px-8 pb-32 md:pb-8 max-w-[1400px]"} mx-auto w-full`}>
          {activeTab === "dashboard" && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Room stats grid */}
              <div className="grid grid-cols-6 lg:grid-cols-5 gap-2 md:gap-3">
                {/* Capacity */}
                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center p-3 md:p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                  <Users
                    size={18}
                    className="text-secondary/50 group-hover:text-primary transition-colors mb-1.5"
                  />
                  <p className="text-[11px] md:text-sm font-black text-on-surface">
                    {occupancy.active}
                    <span className="text-outline text-[9px] md:text-xs">
                      /{room.total_seats}
                    </span>
                  </p>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-secondary/60 mt-1 font-bold">
                    Capacity
                  </span>
                </div>

                {/* Tier */}
                <div className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center p-3 md:p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md transition-all group">
                  <ShieldCheck
                    size={18}
                    className="text-secondary/50 group-hover:text-primary transition-colors mb-1.5"
                  />
                  <p className="text-[10px] md:text-xs font-black text-on-surface uppercase truncate max-w-full px-2">
                    {room.tier || "Standard"}
                  </p>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-secondary/60 mt-1 font-bold">
                    Tier
                  </span>
                </div>

                {/* Join Key */}
                <button
                  onClick={handleRegenerateKey}
                  className="col-span-2 lg:col-span-1 flex flex-col items-center justify-center p-3 md:p-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/10 shadow-sm hover:shadow-md hover:bg-primary/5 hover:border-primary/20 transition-all group outline-none focus:ring-2 ring-primary/40"
                  title="Click to regenerate key"
                >
                  <Key
                    size={18}
                    className="text-secondary/50 group-hover:text-primary transition-colors mb-1.5"
                  />
                  <p className="text-[10px] md:text-xs font-black text-primary uppercase w-full truncate px-1">
                    {room.join_key}
                  </p>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-secondary/60 group-hover:text-primary/60 mt-1 font-bold flex items-center gap-1">
                    Key{" "}
                    <RotateCw
                      size={8}
                      className="group-hover:rotate-180 transition-transform duration-500"
                    />
                  </span>
                </button>

                {/* Show QR */}
                <button
                  onClick={() => setShowQR(true)}
                  className="col-span-3 lg:col-span-1 flex flex-col items-center justify-center p-3 md:p-4 bg-primary/5 rounded-2xl border border-primary/10 shadow-sm hover:shadow-md hover:bg-primary group transition-all outline-none focus:ring-2 ring-primary/40"
                >
                  <QrCode
                    size={20}
                    className="text-primary group-hover:text-white transition-colors mb-1.5"
                  />
                  <p className="text-[11px] md:text-xs font-black text-primary group-hover:text-white uppercase transition-colors">
                    Access QR
                  </p>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-primary/60 group-hover:text-white/60 mt-1 font-bold">
                    Display
                  </span>
                </button>

                {/* Attendance Scanner */}
                <button
                  onClick={() => setShowScanner(true)}
                  className="col-span-3 lg:col-span-1 flex flex-col items-center justify-center p-3 md:p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/10 shadow-sm hover:shadow-md hover:bg-emerald-500 group transition-all outline-none focus:ring-2 ring-emerald-500/40"
                >
                  <ScanLine
                    size={20}
                    className="text-emerald-600 group-hover:text-white transition-colors mb-1.5"
                  />
                  <p className="text-[11px] md:text-xs font-black text-emerald-600 group-hover:text-white uppercase transition-colors">
                    Live View
                  </p>
                  <span className="text-[8px] uppercase tracking-[0.2em] text-emerald-600/60 group-hover:text-white/60 mt-1 font-bold">
                    Attendance
                  </span>
                </button>
              </div>

              {/* Dashboard charts */}
              <div className="pt-6 border-t border-outline-variant/10">
                <RoomDashboardTab roomId={room.id} roomName={room.name} />
              </div>
            </div>
          )}

          {activeTab === "students" && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
              <RoomStudentsTab
                roomId={roomId}
                roomName={room.name}
                currentUserId={managerId}
                currentUserName={managerName}
                isOnline={isOnline}
              />
            </div>
          )}

          {activeTab === "chats" && (
            <div className="animate-in slide-in-from-bottom-4 fade-in duration-300">
              <RoomChat
                roomId={room.id}
                currentUserId={managerId}
                currentUserName={managerName}
                currentUserType="manager"
                onlineUsers={onlineUsers}
                isOnline={isOnline}
              />
            </div>
          )}
        </div>
        {/* end scroll-area */}
      </div>
      {/* end page-shell */}

      {/* ═══════════ MODALS ═══════════ */}

      {/* Edit Room Modal */}
      {showEditRoom && (
        <Modal
          open={showEditRoom}
          onClose={() => setShowEditRoom(false)}
          title="Configure Room Parameters"
        >
          <form onSubmit={handleSaveRoom} className="space-y-8 pt-6 pb-2">
            <div className="space-y-6">
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-on-surface-variant flex items-center gap-2 ml-1">
                  <Info size={14} className="text-primary" /> Room Name
                </label>
                <input
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="input"
                  placeholder="e.g. South Reading Block"
                />
              </div>
              <div className="space-y-2.5">
                <label className="text-xs font-bold text-on-surface-variant ml-1">
                  Room Location / Address
                </label>
                <input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="input"
                  placeholder="e.g. 2nd Floor, Knowledge Park"
                />
              </div>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">
                    Total Capacity
                  </label>
                  <input
                    type="number"
                    value={formData.capacity}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        capacity: parseInt(e.target.value) || 0,
                      })
                    }
                    className="input font-bold"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-on-surface-variant ml-1">
                    Room Tier
                  </label>
                  <select
                    value={formData.tier}
                    onChange={(e) =>
                      setFormData({ ...formData, tier: e.target.value })
                    }
                    className="input font-extrabold cursor-pointer"
                  >
                    <option value="standard">Standard</option>
                    <option value="premium">Premium Elite</option>
                  </select>
                </div>
              </div>
              <div className="p-5 bg-surface-container-low rounded-2xl border border-outline-variant/20 space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <p className="text-[11px] font-extrabold text-primary uppercase tracking-widest">
                      Geofence Strictness
                    </p>
                    <p className="text-[10px] font-bold text-outline mt-1">
                      Check-in radius in meters
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 text-primary text-[10px] font-extrabold uppercase tracking-widest rounded-xl hover:border-primary transition-all flex items-center gap-2"
                  >
                    <MapPin size={14} />
                    Locate
                  </button>
                </div>
                {formData.latitude !== null && formData.longitude !== null && (
                  <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-1 duration-300">
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">
                        Manual Latitude
                      </label>
                      <input
                        type="number"
                        step="any"
                        value={formData.latitude || ""}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            latitude: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="input py-2 text-[11px] font-bold"
                        placeholder="e.g. 28.6139"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-outline uppercase tracking-widest ml-1">
                        Manual Longitude
                      </label>
                      <div className="relative group">
                        <input
                          type="number"
                          step="any"
                          value={formData.longitude || ""}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              longitude: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="input py-2 text-[11px] font-bold pr-10"
                          placeholder="e.g. 77.2090"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setFormData({
                              ...formData,
                              latitude: null,
                              longitude: null,
                            })
                          }
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg hover:bg-error/10 text-outline hover:text-error transition-all flex items-center justify-center"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={formData.radius}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          radius: parseInt(e.target.value),
                        })
                      }
                      className="flex-1 h-2 bg-outline-variant/30 rounded-full appearance-none cursor-pointer accent-primary"
                    />
                    <span className="w-16 text-center text-sm font-extrabold text-primary bg-surface-container-lowest px-2 py-1 rounded-lg border border-outline-variant/20">
                      {formData.radius}m
                    </span>
                  </div>
                  <div className="flex justify-between text-[9px] font-extrabold text-outline tracking-widest">
                    <span>HIGH SECURITY (10m)</span>
                    <span>FLEXIBLE (500m)</span>
                  </div>
                </div>
              </div>
            </div>
            <button
              disabled={saving}
              className="btn-primary w-full py-4.5 rounded-2xl shadow-2xl shadow-primary/30"
            >
              <ShieldCheck size={20} />
              <span>{saving ? "UPDATING..." : "SAVE CONFIGURATION"}</span>
            </button>
          </form>
        </Modal>
      )}

      {/* QR Display Modal */}
      {showQR && (
        <Modal
          open={showQR}
          onClose={() => setShowQR(false)}
          title="Room QR Code"
        >
          <QRDisplay
            roomId={room.id}
            roomName={room.name}
            latitude={room.latitude}
            longitude={room.longitude}
            radius={room.radius}
            qrVersion={room.qr_version}
            onRegenerate={handleRegenerateRoomQR}
          />
        </Modal>
      )}
    </>
  );
}
