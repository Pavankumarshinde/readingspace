"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Save,
  UserPlus,
  Mail,
  Phone,
  Calendar,
  Armchair,
  Building,
  Clock,
  Send,
  ShieldCheck,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import toast from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";

function AddStudentForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeRoomId = searchParams.get("room");

  const [loading, setLoading] = useState(false);
  const [rooms, setRooms] = useState<{ id: string; name: string }[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    room: "",
    seat: "",
    startDate: "", // We will calculate this on mount to avoid SSR mismatch
    endDate: "",
    paymentStatus: "paid", // default
  });

  // Hydrate dates safely on the client
  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      startDate: format(new Date(), "yyyy-MM-dd"),
      endDate: format(
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        "yyyy-MM-dd",
      ),
    }));
  }, []);

  useEffect(() => {
    const fetchRooms = async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("manager_id", user.id);

      if (data) {
        setRooms(data);
        if (routeRoomId && data.some((r) => r.id === routeRoomId)) {
          setFormData((prev) => ({ ...prev, room: routeRoomId }));
        } else if (data.length > 0) {
          setFormData((prev) => ({ ...prev, room: data[0].id }));
        }
      }
    };
    fetchRooms();
  }, [routeRoomId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (new Date(formData.endDate) < new Date(formData.startDate)) {
      toast.error("End date must be on or after the start date");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/manager/students/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Failed to add student");
      } else {
        toast.success("Registration complete!");
        router.push("/manager/rooms");
        router.refresh();
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to process request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell bg-surface">
      {/* Precision Header */}
      <header className="bg-surface/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-outline-variant/10 pt-[calc(env(safe-area-inset-top,0px))]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between w-full">
          <div className="flex items-center gap-4 md:gap-6">
            <button
              onClick={() => router.back()}
              suppressHydrationWarning
              className="w-10 h-10 rounded-full bg-surface-container-lowest flex items-center justify-center text-on-surface-variant hover:text-primary hover:bg-primary/5 transition-all shadow-sm border border-outline-variant/5 hover:scale-105"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
            </button>
            <div className="flex flex-col">
              <h1 className="font-headline text-on-surface tracking-tight leading-none text-base font-bold">
                Complete Registration
              </h1>
              <p className="text-[9px] md:text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-[0.2em] mt-1.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60 inline-block animate-pulse"></span>
                MANAGED ACCOUNT CREATION
              </p>
            </div>
          </div>
          <button
            form="enroll-form"
            type="submit"
            disabled={loading}
            suppressHydrationWarning
            className="bg-primary text-white py-2.5 px-6 rounded-2xl text-[11px] font-bold uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <Save size={16} strokeWidth={2.5} />
            <span className="hidden md:inline">Save Record</span>
            <span className="md:hidden">Save</span>
          </button>
        </div>
      </header>

      <main className="scroll-area max-w-4xl mx-auto px-4 md:px-8 pt-8 pb-24 w-full space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
        <form
          id="enroll-form"
          onSubmit={handleSave}
          className="space-y-10"
          suppressHydrationWarning
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-12 space-y-10">
              {/* Profile Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center text-secondary">
                    <UserPlus size={18} strokeWidth={2.5} />
                  </div>
                  <h2 className="font-headline text-on-surface tracking-tight text-base font-medium">
                    Personal Identity
                  </h2>
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-8 shadow-sm border border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Full Identity Name
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <UserPlus size={18} strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        required
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 text-[15px] font-bold text-on-surface placeholder:text-on-surface-variant/30 transition-all outline-none"
                        placeholder="e.g. Vikram Batra"
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Contact Number
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Phone size={18} strokeWidth={2} />
                      </div>
                      <input
                        type="tel"
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 text-[15px] font-bold text-on-surface placeholder:text-on-surface-variant/30 transition-all outline-none"
                        placeholder="+91 XXXXX XXXXX"
                        value={formData.phone}
                        onChange={(e) =>
                          setFormData({ ...formData, phone: e.target.value })
                        }
                      />
                    </div>
                  </div>
                </div>
              </section>

              {/* Assignment Section */}
              <section className="space-y-5">
                <div className="flex items-center gap-3 px-2">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Armchair size={18} strokeWidth={2.5} />
                  </div>
                  <h2 className="font-headline text-on-surface tracking-tight text-base font-medium">
                    Membership Assignment
                  </h2>
                </div>

                <div className="bg-surface-container-lowest rounded-[2rem] p-6 md:p-8 shadow-sm border border-outline-variant/10 grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Reading Room Node
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors pointer-events-none">
                        <Building size={18} strokeWidth={2} />
                      </div>
                      <select
                        required
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 pr-10 text-[15px] font-bold text-on-surface cursor-pointer appearance-none outline-none transition-all"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(0,0,0,0.5)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundPosition: "right 1rem center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "1.25rem",
                        }}
                        value={formData.room}
                        onChange={(e) =>
                          setFormData({ ...formData, room: e.target.value })
                        }
                      >
                        {rooms.length === 0 && (
                          <option value="">Loading active rooms...</option>
                        )}
                        {rooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Allocated Seat Code
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Armchair size={18} strokeWidth={2} />
                      </div>
                      <input
                        type="text"
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 text-[15px] font-bold font-mono tracking-widest uppercase text-on-surface placeholder:text-on-surface-variant/30 transition-all outline-none"
                        placeholder="S-42"
                        value={formData.seat}
                        onChange={(e) =>
                          setFormData({ ...formData, seat: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="hidden md:block"></div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Start Date
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Calendar size={18} strokeWidth={2} />
                      </div>
                      <input
                        type="date"
                        required
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 text-[15px] font-bold text-on-surface outline-none transition-all"
                        value={formData.startDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            startDate: e.target.value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      End Date
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">
                        <Clock size={18} strokeWidth={2} />
                      </div>
                      <input
                        type="date"
                        required
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-12 text-[15px] font-bold text-on-surface outline-none transition-all"
                        value={formData.endDate}
                        onChange={(e) =>
                          setFormData({ ...formData, endDate: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    <label className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest block ml-2">
                      Payment Status
                    </label>
                    <div className="relative group">
                      <select
                        required
                        suppressHydrationWarning
                        className="w-full bg-surface-container-low/50 border border-transparent focus:border-outline-variant/20 focus:bg-surface-container-lowest rounded-2xl p-4 pl-4 pr-10 text-[15px] font-bold text-on-surface cursor-pointer appearance-none outline-none transition-all"
                        style={{
                          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='rgba(0,0,0,0.5)'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                          backgroundPosition: "right 1rem center",
                          backgroundRepeat: "no-repeat",
                          backgroundSize: "1.25rem",
                        }}
                        value={formData.paymentStatus}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            paymentStatus: e.target.value,
                          })
                        }
                      >
                        <option value="paid">Paid</option>
                        <option value="due">Due</option>
                      </select>
                    </div>
                  </div>
                </div>
              </section>

              <section className="bg-surface-container-low p-6 rounded-3xl border border-outline-variant/10 flex items-center gap-5 animate-in slide-in-from-top-2 duration-300">
                <div className="w-12 h-12 rounded-2xl bg-surface-container-lowest flex items-center justify-center text-on-surface-variant/60 shadow-sm border border-outline-variant/5">
                  <ShieldCheck size={24} strokeWidth={1.5} />
                </div>
                <p className="text-[13px] font-medium text-on-surface-variant/80 leading-snug">
                  <span className="font-bold text-on-surface block mb-0.5 tracking-wide">
                    Managed Architecture
                  </span>
                  Identity managed entirely by facility operator. Zero digital
                  footprint or external login exposed.
                </p>
              </section>

              <button
                type="submit"
                disabled={loading}
                suppressHydrationWarning
                className="w-full bg-primary text-white py-5 rounded-[2rem] text-[13px] font-bold uppercase tracking-widest shadow-xl shadow-primary/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 disabled:opacity-70 lg:hidden"
              >
                <CheckCircle2 size={18} strokeWidth={2.5} />
                <span>
                  {loading ? "Processing..." : "Complete Registration"}
                </span>
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}

export default function AddStudent() {
  return (
    <Suspense
      fallback={
        <div className="page-shell items-center justify-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <AddStudentForm />
    </Suspense>
  );
}
