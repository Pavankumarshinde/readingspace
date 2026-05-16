"use client";

import { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";
import { format } from "date-fns";
import {
  User,
  Mail,
  Phone,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Plus,
  Search,
  Users,
  ChevronRight,
  UserCircle,
  Pencil,
  Trash2,
  CreditCard,
  QrCode,
  RefreshCw,
  Wifi,
  UserPlus,
  X,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useRoomPresence } from "@/hooks/useRoomPresence";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import StudentPlanBillingModal from "./StudentPlanBillingModal";

const getStatusStyle = (status: string) => {
  switch (status) {
    case "active":
      return "bg-emerald-50 text-emerald-600 border-emerald-100";
    case "due":
      return "bg-amber-50 text-amber-600 border-amber-100";
    case "expired":
    case "overdue":
      return "bg-rose-50 text-rose-600 border-rose-100";
    default:
      return "bg-slate-50 text-slate-500 border-slate-100";
  }
};

const getMemberTypeStyle = (type: string) => {
  switch (type) {
    case "managed":
      return "bg-secondary/10 text-secondary border-secondary/20";
    case "digital":
      return "bg-primary/10 text-primary border-primary/20";
    default:
      return "bg-slate-100 text-slate-500 border-slate-200";
  }
};

// Payment-based active/expired:
// - ACTIVE if any PAID installment covers today
// - effectiveExpiry = latest end_date among all paid installments (what's shown as expiry)
const getPaymentBasedStatus = (
  installments: any[]
): { status: "active" | "expired"; effectiveExpiry: string | null } => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const paid = (installments || []).filter((ins: any) => ins.status === "paid");

  // Active if any paid installment covers today
  const activePaid = paid.filter((ins: any) => {
    const s = new Date(ins.start_date);
    s.setHours(0, 0, 0, 0);
    const e = new Date(ins.end_date);
    e.setHours(23, 59, 59, 999);
    return s <= today && today <= e;
  });

  // Latest end_date among all paid installments (used as displayed expiry)
  const effectiveExpiry =
    paid.length > 0
      ? paid.reduce(
          (max: string, ins: any) =>
            ins.end_date > max ? ins.end_date : max,
          paid[0].end_date
        )
      : null;

  return {
    status: activePaid.length > 0 ? "active" : "expired",
    effectiveExpiry,
  };
};

const colors = [
  "bg-indigo-50 text-indigo-600 border-indigo-100",
  "bg-cyan-50 text-cyan-600 border-cyan-100",
  "bg-violet-50 text-violet-600 border-violet-100",
  "bg-emerald-50 text-emerald-600 border-emerald-100",
];

export default function RoomStudentsTab({
  roomId,
  roomName,
  currentUserId,
  currentUserName,
  isOnline,
}: {
  roomId: string;
  roomName: string;
  currentUserId: string;
  currentUserName: string;
  isOnline: (userId: string) => boolean;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expired" | "requests">(
    "active",
  );
  const [students, setStudents] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const pageSize = 50;
  const supabase = createClient();

  // Actions state
  const [acting, setActing] = useState(false);

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "default";
  }>({ open: false, title: "", message: "", onConfirm: () => {} });

  // QR Modal
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedStudentQR, setSelectedStudentQR] = useState<any>(null);

  // Approv Modal
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [approvalData, setApprovalData] = useState({
    seatNumber: "",
    tier: "standard",
    startDate: format(new Date(), "yyyy-MM-dd"),
    endDate: format(
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      "yyyy-MM-dd",
    ),
  });

  // Edit Modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] =
    useState<any>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    phone: "",
    seat: "",
    membershipType: "digital",
  });

  // Renew Modal
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedStudentForRenew, setSelectedStudentForRenew] =
    useState<any>(null);
  const [renewFormData, setRenewFormData] = useState({
    startDate: "",
    endDate: "",
  });

  // Plan & Billing Modal
  const [showInstallmentsModal, setShowInstallmentsModal] = useState(false);
  const [selectedStudentForInstallments, setSelectedStudentForInstallments] =
    useState<any>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: subsData, error: subsError, count } = await supabase
        .from("subscriptions")
        .select(
          `id, seat_number, tier, membership_type, qr_version, student:profiles!inner(id, name, email, phone, gender, membership_type)`,
          { count: "exact" }
        )
        .eq("room_id", roomId)
        .range((page - 1) * pageSize, page * pageSize - 1);

      setTotalStudents(count || 0);

      if (subsError) throw subsError;

      if (subsData) {
        // Fetch installments for ALL students in this room (single query, no N+1)
        // We key by student_id+room_id since installments don't always have subscription_id
        const studentIds = subsData.map((s: any) => s.student.id);
        const { data: allInstallments } = await supabase
          .from("installments")
          .select("subscription_id, student_id, start_date, end_date, status")
          .eq("room_id", roomId)
          .in("student_id", studentIds.length > 0 ? studentIds : ["_none_"]);

        // Group installments by subscription_id, fall back to student_id matching
        const installmentsBySubId = new Map<string, any[]>();
        const installmentsByStudentId = new Map<string, any[]>();
        (allInstallments || []).forEach((ins: any) => {
          if (ins.subscription_id) {
            const arr = installmentsBySubId.get(ins.subscription_id) || [];
            arr.push(ins);
            installmentsBySubId.set(ins.subscription_id, arr);
          }
          // Also index by student_id for fallback
          const sarr = installmentsByStudentId.get(ins.student_id) || [];
          sarr.push(ins);
          installmentsByStudentId.set(ins.student_id, sarr);
        });

        const formatted = subsData.map((sub: any, index: number) => {
          // Prefer sub-id match; fall back to student_id match
          const subInstallments =
            installmentsBySubId.get(sub.id) ||
            installmentsByStudentId.get(sub.student.id) ||
            [];
          const { status: payStatus, effectiveExpiry } =
            getPaymentBasedStatus(subInstallments);
          // effectiveExpiry = latest paid installment end_date; null if no paid installments
          // sub.end_date is no longer fetched (not in select) — installments are the source of truth
          const displayExpiry = effectiveExpiry ?? null;
          return {
            subscriptionId: sub.id,
            id: sub.id.substring(0, 8).toUpperCase(),
            studentUid: sub.student.id,
            name: sub.student.name || "Unknown",
            email: sub.student.email,
            phone: sub.student.phone || "No phone",
            status: payStatus,
            start: sub.start_date,
            expiry: displayExpiry,
            seatNumber: sub.seat_number || "Unassigned",
            membershipType:
              sub.membership_type || sub.student.membership_type || "digital",
            qrVersion: sub.qr_version || 0,
            color: colors[index % colors.length],
          };
        });
        setStudents(formatted);
      }

      const { data: reqsData, error: reqsError } = await supabase
        .from("join_requests")
        .select(`*, student:profiles(*)`)
        .eq("room_id", roomId)
        .eq("status", "pending");

      if (reqsError) throw reqsError;
      if (reqsData) setRequests(reqsData);
    } catch (err: any) {
      toast.error(`Sync failed: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchData();
  }, [roomId, page]);

  // Reset page when switching tabs or changing search
  useEffect(() => {
    setPage(1);
  }, [searchTerm, filter]);

  // Sync the open billing modal's student snapshot whenever the students list refreshes.
  // This ensures the status badge and expiry in the modal update immediately after
  // any payment action — because everything is derived from the installments table.
  useEffect(() => {
    if (!showInstallmentsModal || !selectedStudentForInstallments) return;
    const updated = students.find(
      (s) => s.studentUid === selectedStudentForInstallments.studentUid
    );
    if (updated) setSelectedStudentForInstallments(updated);
  }, [students]);

  const handleRegenerateStudentPass = async (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: "Regenerate Pass",
      message: "This will invalidate the current access pass and issue a new one. Continue?",
      variant: "warning",
      onConfirm: async () => {
        try {
          const res = await fetch("/api/manager/students/regenerate-pass", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          });
          if (res.ok) {
            toast.success("Student pass regenerated");
            setSelectedStudentQR((prev: any) => ({ ...prev, qrVersion: (prev.qrVersion || 0) + 1 }));
            fetchData();
          } else {
            const err = await res.json();
            toast.error(err.error || "Failed to regenerate");
          }
        } catch (e) {
          toast.error("Network failure");
        }
      },
    });
  };

  const handleDeclineRequest = async (requestId: string) => {
    setActing(true);
    try {
      const { error } = await supabase
        .from("join_requests")
        .update({ status: "rejected" })
        .eq("id", requestId);
      if (error) throw error;
      toast.success("Request removed");
      fetchData();
    } catch (err) {
      toast.error("Operation failed");
    } finally {
      setActing(false);
    }
  };

  const handleApproveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;
    setActing(true);
    try {
      // 1. Create enrollment record (seat, tier only — no payment data)
      const { data: newSub, error: subError } = await supabase
        .from("subscriptions")
        .insert({
          student_id: selectedRequest.student_id,
          room_id: roomId,
          seat_number: approvalData.seatNumber,
          tier: approvalData.tier,
          // Shadow copies for DB NOT NULL constraint — app reads from installments
          start_date: approvalData.startDate,
          end_date: approvalData.endDate,
        })
        .select("id")
        .single();

      if (subError) throw subError;

      // 2. Create first installment — the real payment/plan record
      const today = format(new Date(), "yyyy-MM-dd");
      await supabase.from("installments").insert({
        student_id: selectedRequest.student_id,
        room_id: roomId,
        subscription_id: newSub.id,
        start_date: approvalData.startDate,
        end_date: approvalData.endDate,
        status: "paid",
        payment_date: new Date().toISOString(),
      });

      // 3. Mark join request accepted
      const { error: reqUpdateError } = await supabase
        .from("join_requests")
        .update({ status: "accepted" })
        .eq("id", selectedRequest.id);

      if (reqUpdateError) throw reqUpdateError;

      toast.success("Membership activated!");
      setShowApproveModal(false);
      fetchData();
    } catch (err) {
      toast.error("Approval failed");
    } finally {
      setActing(false);
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForEdit) return;
    setActing(true);
    try {
      const res = await fetch("/api/manager/students/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscriptionId: selectedStudentForEdit.subscriptionId,
          name: editFormData.name,
          phone: editFormData.phone,
          seat: editFormData.seat,
          membershipType: editFormData.membershipType,
        }),
      });

      if (res.ok) {
        toast.success("Student details updated");
        setShowEditModal(false);
        fetchData();
      } else {
        toast.error("Update failed");
      }
    } catch (e) {
      toast.error("Network connection error");
    } finally {
      setActing(false);
    }
  };

  const handleRenewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentForRenew) return;
    setActing(true);
    try {
      // Renewal = add a new paid installment; status is computed from installments
      const res = await fetch("/api/manager/students/installments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentForRenew.studentUid,
          roomId,
          subscriptionId: selectedStudentForRenew.subscriptionId,
          startDate: renewFormData.startDate,
          endDate: renewFormData.endDate,
          status: "paid",
          paymentDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        toast.success("Subscription renewed — new paid installment added");
        setShowRenewModal(false);
        fetchData();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to renew");
      }
    } catch (e) {
      toast.error("Network error");
    } finally {
      setActing(false);
    }
  };

  const handleDeleteStudent = async (subscriptionId: string) => {
    setConfirmDialog({
      open: true,
      title: "Remove Student",
      message: "Are you sure you want to remove this student from the room? This action cannot be undone.",
      variant: "danger",
      onConfirm: async () => {
        setActing(true);
        try {
          const res = await fetch("/api/manager/students/delete", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscriptionId }),
          });
          if (res.ok) {
            toast.success("Student removed");
            fetchData();
          } else {
            toast.error("Failed to remove");
          }
        } catch (e) {
          toast.error("Network error");
        } finally {
          setActing(false);
        }
      },
    });
  };

  const filteredItems =
    filter === "requests"
      ? requests.filter((r) =>
          (r.student?.name || "")
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
        )
      : students.filter((s) => {
          const matchesSearch =
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.email.toLowerCase().includes(searchTerm.toLowerCase());
          const matchesFilter =
            filter === "all"
              ? true
              : filter === "active"
                ? s.status === "active"
                : s.status !== "active";
          return matchesSearch && matchesFilter;
        });

  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      {/* Sticky: Search + Filter */}
      <div className="sticky top-0 z-10 bg-surface pb-2 flex flex-col gap-3">
        {/* Desktop Layout & Mobile Row 1 */}
        <div className="flex flex-row items-center gap-3 w-full">
          {/* Search Bar - Grows to fill space */}
          <div className="relative flex-1 min-w-0 group">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search reader..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 md:py-3.5 bg-white rounded-2xl border border-outline-variant/10 text-[11px] md:text-sm outline-none focus:ring-1 focus:ring-primary focus:border-primary/30 transition-all font-bold placeholder:text-on-surface-variant/30 placeholder:font-medium text-on-surface"
            />
          </div>

          {/* Filter Tabs (Desktop Only) */}
          <div className="hidden lg:flex p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 ml-auto shrink-0">
            {(["all", "active", "expired", "requests"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-6 py-2.5 text-[11px] font-black rounded-xl transition-all relative uppercase tracking-widest whitespace-nowrap ${
                  filter === mode
                    ? "bg-surface-container-lowest text-primary shadow-sm"
                    : "text-on-surface-variant/60 hover:text-on-surface"
                }`}
              >
                <span>{mode}</span>
                {mode === "requests" && requests.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex items-center justify-center px-1.5 min-w-[18px] h-[18px] bg-error text-white rounded-full font-black text-[9px] shadow-lg shadow-error/20">
                    {requests.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Enroll Button / Add Icon */}
          <a
            href={`/manager/students/add?room=${roomId}`}
            aria-label="Add student"
            className="shrink-0 flex items-center justify-center w-12 h-12 lg:w-auto lg:px-6 lg:py-3 bg-primary text-white rounded-2xl shadow-lg shadow-primary/20 hover:opacity-90 hover:scale-[1.02] active:scale-95 transition-all font-black text-[11px] uppercase tracking-widest gap-2"
          >
            <UserPlus size={20} className="lg:w-4 lg:h-4" />
            <span className="hidden lg:inline"></span>
          </a>
        </div>

        {/* Filter Tabs (Mobile & Tablet) */}
        <div className="flex lg:hidden p-1 bg-surface-container-low rounded-2xl border border-outline-variant/10 w-full shrink-0">
          {(["all", "active", "expired", "requests"] as const).map((mode) => (
            <button
              key={`mobile-${mode}`}
              onClick={() => setFilter(mode)}
              className={`flex-1 px-2 py-3 text-[10px] sm:text-[11px] font-black rounded-xl transition-all relative uppercase tracking-widest whitespace-nowrap ${
                filter === mode
                  ? "bg-surface-container-lowest text-primary shadow-sm"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
            >
              <span>{mode}</span>
              {mode === "requests" && requests.length > 0 && (
                <span className="absolute -top-1 right-0 sm:right-2 flex items-center justify-center px-1.5 min-w-[18px] h-[18px] bg-error text-white rounded-full font-black text-[9px] shadow-lg shadow-error/20">
                  {requests.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex justify-center">
          <div className="w-8 h-8 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-16 bg-surface-container-lowest border border-outline-variant/5 rounded-2xl">
          <Users
            className="mx-auto text-on-surface-variant/20 mb-3"
            size={32}
          />
          <p className="font-bold text-on-surface-variant">No students found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filter === "requests"
            ? filteredItems.map((req) => (
                <div
                  key={req.id}
                  className="p-5 bg-white border border-outline-variant/10 rounded-2xl shadow-sm flex flex-col gap-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center font-black text-xl text-primary">
                      {req.student?.name?.[0]?.toUpperCase() || "S"}
                    </div>
                    <div>
                      <h3 className="text-base text-on-surface font-medium">
                        {req.student?.name}
                      </h3>
                      <p className="text-[10px] text-on-surface-variant/60">
                        {req.student?.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-auto pt-2 border-t border-outline-variant/5">
                    <button
                      disabled={acting}
                      onClick={() => {
                        setSelectedRequest(req);
                        setShowApproveModal(true);
                      }}
                      className="flex-1 bg-primary text-white py-2 rounded-lg text-xs font-bold"
                    >
                      Review
                    </button>
                    <button
                      disabled={acting}
                      onClick={() => handleDeclineRequest(req.id)}
                      aria-label="Decline request"
                      className="w-10 flex items-center justify-center bg-error/10 text-error rounded-lg"
                    >
                      <XCircle size={18} />
                    </button>
                  </div>
                </div>
              ))
            : filteredItems.map((student) => (
                <div
                  key={student.subscriptionId}
                  className="group p-4 bg-surface-container-lowest hover:bg-surface-container-low transition-colors rounded-2xl border border-outline-variant/10 flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0 pr-4">
                    <div className="flex items-center gap-2 mb-1.5">
                      <h3 className="text-sm text-on-surface uppercase tracking-tight truncate text-base font-medium">
                        {student.name}
                      </h3>
                      <span className="shrink-0 text-[9px] text-primary bg-primary/10 px-1.5 py-0.5 rounded-sm font-black uppercase tracking-widest">
                        {student.seatNumber}
                      </span>
                      {isOnline(student.studentUid) && (
                        <span className="flex items-center gap-1 text-[8px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full uppercase tracking-widest animate-pulse border border-emerald-100">
                          <Wifi size={8} /> Online
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${getStatusStyle(student.status)}`}
                      >
                        {student.status}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded-sm text-[8px] font-black uppercase tracking-widest ${getMemberTypeStyle(student.membershipType)}`}
                      >
                        {student.membershipType}
                      </span>
                      <span className="text-[9px] text-secondary/60 font-bold uppercase tracking-widest flex items-center gap-1">
                        <ChevronRight
                          size={10}
                          className="text-outline-variant/50"
                        />
                        {student.expiry
                          ? `EXP ${format(new Date(student.expiry), "dd MMM")}`
                          : "EXP —"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => {
                        setSelectedStudentForInstallments(student);
                        setShowInstallmentsModal(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-outline-variant/10 shadow-sm rounded-lg text-secondary hover:bg-secondary/5 transition-colors"
                      title="Payment History"
                      aria-label="View payment history"
                    >
                      <CreditCard size={14} />
                    </button>
                    <button
                      onClick={() => {
                        setSelectedStudentForEdit(student);
                        setEditFormData({
                          name: student.name,
                          phone:
                            student.phone === "No phone" ? "" : student.phone,
                          seat: student.seatNumber,
                          membershipType: student.membershipType,
                        });
                        setShowEditModal(true);
                      }}
                      className="w-8 h-8 flex items-center justify-center bg-white border border-outline-variant/10 shadow-sm rounded-lg text-on-surface-variant hover:text-primary transition-colors"
                      title="Edit"
                      aria-label="Edit student"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() =>
                        handleDeleteStudent(student.subscriptionId)
                      }
                      className="w-8 h-8 flex items-center justify-center bg-white border border-outline-variant/10 shadow-sm rounded-lg text-on-surface-variant hover:text-error transition-colors"
                      title="Delete"
                      aria-label="Delete student"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

        </div>
      )}

      {/* Pagination Controls */}
      {totalStudents > pageSize && filter !== "requests" && (
        <div className="flex items-center justify-between px-4 py-4 mt-6 bg-surface-container-lowest border border-outline-variant/10 rounded-2xl">
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">
            Showing {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, totalStudents)} of {totalStudents}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Previous
            </button>
            <button
              disabled={page * pageSize >= totalStudents}
              onClick={() => setPage(p => p + 1)}
              className="px-4 py-2 text-[10px] font-black uppercase tracking-widest bg-surface-container-low text-on-surface hover:bg-surface-container disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Review Request Modal */}
      {showApproveModal && selectedRequest && (
        <Modal
          open={showApproveModal}
          onClose={() => setShowApproveModal(false)}
          title="Approve Request"
        >
          <form onSubmit={handleApproveSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  Seat
                </label>
                <input
                  required
                  type="text"
                  className="input mt-1"
                  value={approvalData.seatNumber}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      seatNumber: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  Tier
                </label>
                <select
                  className="input mt-1"
                  value={approvalData.tier}
                  onChange={(e) =>
                    setApprovalData({ ...approvalData, tier: e.target.value })
                  }
                >
                  <option value="standard">Standard</option>
                  <option value="premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  Start
                </label>
                <input
                  type="date"
                  required
                  className="input mt-1"
                  value={approvalData.startDate}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  End
                </label>
                <input
                  type="date"
                  required
                  className="input mt-1"
                  value={approvalData.endDate}
                  onChange={(e) =>
                    setApprovalData({
                      ...approvalData,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              disabled={acting}
              type="submit"
              className="w-full btn-primary mt-2"
            >
              Approve
            </button>
          </form>
        </Modal>
      )}

      {/* Edit Student Modal */}
      {showEditModal && selectedStudentForEdit && (
        <Modal
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          title="Edit Student"
        >
          <form onSubmit={handleUpdateSubmit} className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs font-bold text-on-surface-variant">
                  Name
                </label>
                <input
                  required
                  type="text"
                  className="input mt-1"
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-on-surface-variant">
                  Seat
                </label>
                <input
                  required
                  type="text"
                  className="input mt-1"
                  value={editFormData.seat}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, seat: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  Membership Type
                </label>
                <select
                  className="input mt-1"
                  value={editFormData.membershipType}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      membershipType: e.target.value,
                    })
                  }
                >
                  <option value="digital">Digital</option>
                  <option value="managed">Managed</option>
                </select>
              </div>
            </div>
            <button
              disabled={acting}
              type="submit"
              className="w-full btn-primary mt-2"
            >
              Update
            </button>
          </form>
        </Modal>
      )}

      {/* Renew Student Modal */}
      {showRenewModal && selectedStudentForRenew && (
        <Modal
          open={showRenewModal}
          onClose={() => setShowRenewModal(false)}
          title="Renew Subscription"
        >
          <form onSubmit={handleRenewSubmit} className="space-y-4 pt-4">
            <p className="text-sm text-on-surface-variant mb-2">
              Add a new paid period for{" "}
              <span className="font-bold text-on-surface">
                {selectedStudentForRenew.name}
              </span>
              . A new installment will be created and their status updated automatically.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  New Start Date
                </label>
                <input
                  type="date"
                  required
                  className="input mt-1"
                  value={renewFormData.startDate}
                  onChange={(e) =>
                    setRenewFormData({
                      ...renewFormData,
                      startDate: e.target.value,
                    })
                  }
                />
              </div>
              <div>
                <label className="text-xs font-bold text-on-surface-variant">
                  New End Date
                </label>
                <input
                  type="date"
                  required
                  className="input mt-1"
                  value={renewFormData.endDate}
                  onChange={(e) =>
                    setRenewFormData({
                      ...renewFormData,
                      endDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <button
              disabled={acting}
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold mt-4 transition-colors"
            >
              Confirm Renewal
            </button>
          </form>
        </Modal>
      )}

      {showQRModal && selectedStudentQR && (
        <Modal
          open={showQRModal}
          onClose={() => setShowQRModal(false)}
          title="View QR Pass"
        >
          <div className="printable-pass flex flex-col items-center bg-surface-container-lowest rounded-[32px] overflow-hidden animate-in zoom-in-95 duration-300 p-6 border border-outline-variant/10 print:p-0 print:border-none">
            <div className="printable-pass-content flex flex-col items-center w-full">
              <div className="text-center space-y-1.5 mb-5">
                <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-3 py-1 rounded-full">
                  Member Pass
                </span>
                <h3 className="font-headline text-on-surface pt-1 text-base font-medium">
                  {selectedStudentQR.name}
                </h3>
                <p className="text-[10px] font-bold text-on-surface-variant/70 uppercase tracking-widest">
                  ID: {selectedStudentQR.id.substring(0, 8)}...
                </p>
              </div>

              <div className="p-3 bg-white rounded-2xl border border-outline-variant/10 shadow-sm mb-5 print:shadow-none print:border-none">
                <QRCodeSVG
                  value={JSON.stringify({
                    type: "access_verify",
                    studentId: selectedStudentQR.studentUid,
                    version: selectedStudentQR.qrVersion || 0,
                  })}
                  size={160}
                />
              </div>

              <div className="w-full space-y-3">
                <div className="flex flex-col gap-2 p-3.5 bg-surface-container-low/30 rounded-2xl border border-outline-variant/10">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Reading Space
                    </span>
                    <span className="text-on-surface text-right truncate pl-4">
                      {roomName}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Seat Assigned
                    </span>
                    <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-sm">
                      #{selectedStudentQR.seatNumber}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Email
                    </span>
                    <span className="text-on-surface truncate pl-4">
                      {selectedStudentQR.email}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-on-surface-variant/70 uppercase tracking-widest">
                      Phone
                    </span>
                    <span className="text-on-surface">
                      {selectedStudentQR.phone}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full py-2.5 px-3 bg-secondary/5 rounded-xl border border-secondary/10 mt-5">
                <p className="text-[9px] font-bold text-secondary uppercase tracking-widest text-center leading-relaxed">
                  Scan at room entrance for validation.
                  <br />
                  Member since{" "}
                  {format(new Date(selectedStudentQR.start), "yyyy")}
                </p>
              </div>
            </div>

            <div className="w-full mt-5 space-y-2 print:hidden">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowQRModal(false)}
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
              <button
                onClick={() =>
                  handleRegenerateStudentPass(selectedStudentQR.subscriptionId)
                }
                className="w-full py-2.5 text-[10px] font-bold text-primary/70 hover:text-primary hover:bg-primary/5 rounded-xl transition-colors uppercase tracking-widest flex items-center justify-center gap-1.5"
                title="Invalidate old QR and issue new one"
              >
                <span
                  className="material-symbols-outlined "
                  style={{ fontSize: "14px" }}
                >
                  refresh
                </span>
                Regenerate Access QR
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Student Plan & Billing Modal */}
      {showInstallmentsModal && selectedStudentForInstallments && (
        <StudentPlanBillingModal
          open={showInstallmentsModal}
          onClose={() => setShowInstallmentsModal(false)}
          roomId={roomId}
          student={selectedStudentForInstallments}
          onUpdate={fetchData}
        />
      )}

      {/* Themed Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant || "danger"}
        confirmLabel="Yes, Proceed"
        onClose={() => setConfirmDialog((d) => ({ ...d, open: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
}

