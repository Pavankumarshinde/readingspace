"use client";

import { useEffect } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "warning" | "default";
}

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "danger",
}: ConfirmDialogProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-error text-white hover:opacity-90"
      : variant === "warning"
      ? "bg-amber-500 text-white hover:opacity-90"
      : "bg-primary text-white hover:opacity-90";

  const iconClass =
    variant === "danger"
      ? "text-error bg-error/10"
      : variant === "warning"
      ? "text-amber-500 bg-amber-50"
      : "text-primary bg-primary/10";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-on-surface/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm bg-surface-container-lowest rounded-3xl shadow-2xl border border-outline-variant/10 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon + Title */}
        <div className="p-6 pb-0 flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${iconClass}`}>
            {variant === "danger" ? (
              <Trash2 size={22} />
            ) : (
              <AlertTriangle size={22} />
            )}
          </div>
          <h3 className="font-headline text-on-surface text-base font-medium leading-tight mb-2">
            {title}
          </h3>
          <p className="text-[12px] text-on-surface-variant/70 leading-relaxed font-body max-w-[280px]">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="p-5 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-surface-container text-on-surface-variant text-[11px] font-bold uppercase tracking-widest rounded-2xl hover:bg-surface-container-high transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={() => { onConfirm(); onClose(); }}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest rounded-2xl transition-opacity active:scale-95 ${confirmClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
