"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ className = "" }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`w-8 h-8 rounded-full border border-outline-variant/20 flex items-center justify-center hover:bg-surface-container-low transition-colors shrink-0 ${className}`}
      aria-label="Go back"
    >
      <ArrowLeft size={18} className="text-on-surface" />
    </button>
  );
}
