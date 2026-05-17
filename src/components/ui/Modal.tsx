"use client";

import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
}

export default function Modal({ open, onClose, children, title }: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-ink/60 backdrop-blur-md transition-opacity"
      onClick={onClose}
    >
      <div
        className="bg-surface-container-lowest w-full max-w-md rounded-t-[32px] sm:rounded-[40px] p-10 shadow-ambient transform transition-transform max-h-[80vh] md:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle */}
        <div className="w-12 h-1.5 bg-on-surface-variant/10 rounded-full mx-auto mb-8 sm:hidden shrink-0" />
        <div className="flex items-center gap-4 mb-8 shrink-0">
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-surface-container-low flex items-center justify-center text-on-surface-variant hover:text-primary transition-all shrink-0"
          >
            <ArrowLeft size={20} />
          </button>
          {title && (
            <h3 className="font-display text-on-surface tracking-tight text-base font-medium">
              {title}
            </h3>
          )}
        </div>
        <div className="overflow-y-auto scrollbar-none pr-1 -mr-1">
          {children}
        </div>
      </div>
    </div>
  );
}
