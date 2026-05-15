import { useState, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import Modal from "@/components/ui/Modal";

interface StudentPlanBillingModalProps {
  open: boolean;
  onClose: () => void;
  roomId: string;
  student: {
    studentUid: string;
    subscriptionId?: string;
    name: string;
    email: string;
    status: string;
  };
  onUpdate: () => void; // Called when an installment is added/updated so parent can refresh
}

export default function StudentPlanBillingModal({
  open,
  onClose,
  roomId,
  student,
  onUpdate,
}: StudentPlanBillingModalProps) {
  const [installments, setInstallments] = useState<any[]>([]);
  const [planSummary, setPlanSummary] = useState<any>(null);
  const [loadingInstallments, setLoadingInstallments] = useState(false);
  const [rowActing, setRowActing] = useState<string | null>(null);
  const [markPaidRow, setMarkPaidRow] = useState<string | null>(null);
  const [markPaidDate, setMarkPaidDate] = useState<string>("");

  const [showAddPeriod, setShowAddPeriod] = useState(false);
  const [addPeriodForm, setAddPeriodForm] = useState({
    startDate: "",
    endDate: "",
    amount: "",
    notes: "",
    status: "due",
    paymentDate: "",
  });
  const [savingPeriod, setSavingPeriod] = useState(false);

  const fetchInstallments = async () => {
    setLoadingInstallments(true);
    try {
      const res = await fetch(
        `/api/manager/students/installments?studentId=${student.studentUid}&roomId=${roomId}`,
      );
      const data = await res.json();
      if (res.ok) {
        setInstallments(data.installments || []);
        setPlanSummary(data.subscription || null);
      } else {
        toast.error(data.error || "Failed to fetch installments");
      }
    } catch (err) {
      toast.error("Network error");
    } finally {
      setLoadingInstallments(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchInstallments();
    }
  }, [open, student.studentUid, roomId]);

  const handleMarkInstallmentPaid = async (
    installmentId: string,
    newStatus: string,
    paymentDate: string,
  ) => {
    setRowActing(installmentId);
    try {
      const res = await fetch("/api/manager/students/payment-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          installmentId,
          paymentStatus: newStatus,
          paymentDate,
        }),
      });
      if (res.ok) {
        toast.success(`Marked as ${newStatus}`);
        setMarkPaidRow(null);
        await fetchInstallments();
        onUpdate();
      } else {
        toast.error("Failed to update");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setRowActing(null);
    }
  };

  const handleAddPeriod = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingPeriod(true);
    try {
      const res = await fetch("/api/manager/students/installments/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: student.studentUid,
          roomId,
          subscriptionId: planSummary?.id || student.subscriptionId || null,
          startDate: addPeriodForm.startDate,
          endDate: addPeriodForm.endDate,
          status: addPeriodForm.status,
          paymentDate: addPeriodForm.paymentDate || undefined,
          amount: addPeriodForm.amount || undefined,
          notes: addPeriodForm.notes || undefined,
        }),
      });
      if (res.ok) {
        toast.success("Period added");
        setShowAddPeriod(false);
        setAddPeriodForm({
          startDate: "",
          endDate: "",
          amount: "",
          notes: "",
          status: "due",
          paymentDate: "",
        });
        await fetchInstallments();
        onUpdate();
      } else {
        const d = await res.json();
        toast.error(d.error || "Failed to add period");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSavingPeriod(false);
    }
  };

  const handleClose = () => {
    setMarkPaidRow(null);
    setShowAddPeriod(false);
    onClose();
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={handleClose} title="Student Plan & Billing">
      <div className="space-y-4 pt-2">
        {/* Section A: Plan Summary */}
        <div className="p-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center font-black text-lg text-primary uppercase shrink-0">
              {student.name?.[0] || "S"}
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-on-surface truncate">
                {student.name}
              </h3>
              <p className="text-[9px] text-on-surface-variant/60 uppercase tracking-widest font-bold truncate">
                {student.email || "No email"}
              </p>
            </div>
            <span
              className={`ml-auto shrink-0 px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                student.status === "active"
                  ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  : "bg-rose-50 text-rose-600 border border-rose-100"
              }`}
            >
              {student.status}
            </span>
          </div>
          {(() => {
            const paidInst = installments.filter((i) => i.status === "paid");
            const planStart =
              installments.length > 0
                ? installments.reduce(
                    (min, i) => (i.start_date < min ? i.start_date : min),
                    installments[0].start_date,
                  )
                : planSummary?.start_date;

            const planEnd =
              paidInst.length > 0
                ? paidInst.reduce(
                    (max, i) => (i.end_date > max ? i.end_date : max),
                    paidInst[0].end_date,
                  )
                : installments.length > 0
                  ? installments.reduce(
                      (max, i) => (i.end_date > max ? i.end_date : max),
                      installments[0].end_date,
                    )
                  : planSummary?.end_date;

            return planStart || planSummary ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-surface-container p-2.5 rounded-xl">
                  <p className="text-[8px] text-on-surface-variant/50 uppercase tracking-widest font-bold mb-0.5">
                    Plan Period
                  </p>
                  <p className="text-[10px] font-bold text-on-surface">
                    {planStart ? format(new Date(planStart), "dd MMM") : "—"} →{" "}
                    {planEnd ? format(new Date(planEnd), "dd MMM, yyyy") : "—"}
                  </p>
                </div>
                {planSummary && (
                  <div className="bg-surface-container p-2.5 rounded-xl">
                    <p className="text-[8px] text-on-surface-variant/50 uppercase tracking-widest font-bold mb-0.5">
                      Seat · Tier
                    </p>
                    <p className="text-[10px] font-bold text-on-surface">
                      #{planSummary.seat_number} · {planSummary.tier}
                    </p>
                  </div>
                )}
              </div>
            ) : null;
          })()}
        </div>

        {/* Section B: Payment Timeline */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/60">
              Payment History
            </p>
            {!loadingInstallments && installments.length > 0 && (
              <div className="flex gap-3 text-[9px] font-bold">
                <span className="text-emerald-600">
                  ✓ {installments.filter((i) => i.status === "paid").length}{" "}
                  Paid
                </span>
                <span className="text-rose-500">
                  ● {installments.filter((i) => i.status !== "paid").length} Due
                </span>
              </div>
            )}
          </div>

          {loadingInstallments ? (
            <div className="py-8 flex justify-center">
              <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
          ) : installments.length === 0 ? (
            <div className="text-center py-6 bg-surface-container-lowest border border-outline-variant/5 rounded-2xl">
              <p className="font-bold text-on-surface-variant text-xs">
                No payment records yet
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[38vh] overflow-y-auto pr-1">
              {installments.map((inst) => (
                <div
                  key={inst.id}
                  className="bg-surface-container-lowest border border-outline-variant/10 rounded-xl overflow-hidden"
                >
                  <div className="p-3 flex items-start justify-between gap-3">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-[10px] font-bold text-on-surface">
                        {format(new Date(inst.start_date), "dd MMM")} –{" "}
                        {format(new Date(inst.end_date), "dd MMM, yyyy")}
                      </span>
                      {inst.payment_date && (
                        <span className="text-[9px] text-emerald-600 font-medium">
                          Paid on{" "}
                          {format(new Date(inst.payment_date), "dd MMM, yyyy")}
                        </span>
                      )}
                      {inst.amount && (
                        <span className="text-[9px] text-on-surface-variant/60">
                          ₹{inst.amount}
                        </span>
                      )}
                      {inst.notes && (
                        <span className="text-[9px] text-on-surface-variant/40 italic">
                          {inst.notes}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest ${
                          inst.status === "paid"
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100"
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}
                      >
                        {inst.status}
                      </span>
                      {inst.status !== "paid" ? (
                        <button
                          onClick={() => {
                            setMarkPaidRow(
                              markPaidRow === inst.id ? null : inst.id,
                            );
                            setMarkPaidDate(format(new Date(), "yyyy-MM-dd"));
                          }}
                          disabled={rowActing === inst.id}
                          className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white transition-colors"
                        >
                          {rowActing === inst.id ? "..." : "Mark Paid"}
                        </button>
                      ) : (
                        <button
                          onClick={() =>
                            handleMarkInstallmentPaid(inst.id, "due", "")
                          }
                          disabled={rowActing === inst.id}
                          className="px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-surface-container text-on-surface-variant hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          {rowActing === inst.id ? "..." : "Undo"}
                        </button>
                      )}
                    </div>
                  </div>
                  {markPaidRow === inst.id && (
                    <div className="px-3 pb-3 pt-2 border-t border-primary/10 bg-primary/5 flex items-center gap-2 flex-wrap">
                      <label className="text-[9px] font-black uppercase tracking-widest text-primary">
                        Date
                      </label>
                      <input
                        type="date"
                        value={markPaidDate}
                        max={format(new Date(), "yyyy-MM-dd")}
                        onChange={(e) => setMarkPaidDate(e.target.value)}
                        className="input py-1 text-xs flex-1 min-w-0"
                      />
                      <button
                        onClick={() =>
                          handleMarkInstallmentPaid(
                            inst.id,
                            "paid",
                            markPaidDate,
                          )
                        }
                        disabled={!markPaidDate || rowActing === inst.id}
                        className="px-3 py-1.5 bg-primary text-white rounded-lg text-[9px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-40"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setMarkPaidRow(null)}
                        className="px-2 py-1.5 bg-surface-container text-on-surface-variant rounded-lg text-[9px] font-black uppercase"
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section C: Add New Period */}
        <div className="border border-outline-variant/10 rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowAddPeriod(!showAddPeriod)}
            className="w-full flex items-center justify-between px-4 py-3 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
          >
            <span>+ Add New Period</span>
            <span>{showAddPeriod ? "▲" : "▼"}</span>
          </button>
          {showAddPeriod && (
            <form
              onSubmit={handleAddPeriod}
              className="p-4 space-y-3 bg-surface-container-lowest"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    Start Date
                  </label>
                  <input
                    required
                    type="date"
                    className="input mt-1 text-xs py-2"
                    value={addPeriodForm.startDate}
                    onChange={(e) =>
                      setAddPeriodForm({
                        ...addPeriodForm,
                        startDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    End Date
                  </label>
                  <input
                    required
                    type="date"
                    className="input mt-1 text-xs py-2"
                    value={addPeriodForm.endDate}
                    onChange={(e) =>
                      setAddPeriodForm({
                        ...addPeriodForm,
                        endDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Optional"
                    className="input mt-1 text-xs py-2"
                    value={addPeriodForm.amount}
                    onChange={(e) =>
                      setAddPeriodForm({
                        ...addPeriodForm,
                        amount: e.target.value,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    Status
                  </label>
                  <select
                    className="input mt-1 text-xs py-2"
                    value={addPeriodForm.status}
                    onChange={(e) =>
                      setAddPeriodForm({
                        ...addPeriodForm,
                        status: e.target.value,
                      })
                    }
                  >
                    <option value="due">Due</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                {addPeriodForm.status === "paid" && (
                  <div className="col-span-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                      Payment Date
                    </label>
                    <input
                      type="date"
                      className="input mt-1 text-xs py-2"
                      value={addPeriodForm.paymentDate}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) =>
                        setAddPeriodForm({
                          ...addPeriodForm,
                          paymentDate: e.target.value,
                        })
                      }
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant">
                    Notes
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Half month discount"
                    className="input mt-1 text-xs py-2"
                    value={addPeriodForm.notes}
                    onChange={(e) =>
                      setAddPeriodForm({
                        ...addPeriodForm,
                        notes: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <button
                disabled={savingPeriod}
                type="submit"
                className="w-full py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 disabled:opacity-50"
              >
                {savingPeriod ? "Saving..." : "Save Period"}
              </button>
            </form>
          )}
        </div>

        <button
          onClick={handleClose}
          className="w-full py-3 bg-surface-container text-on-surface text-[11px] font-bold rounded-xl hover:bg-surface-container-high transition-colors uppercase tracking-widest"
        >
          Close
        </button>
      </div>
    </Modal>
  );
}
