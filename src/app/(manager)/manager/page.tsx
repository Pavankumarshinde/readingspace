"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ManagerRoot() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/manager/rooms");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-outline/20">
      <Loader2 className="animate-spin text-4xl text-primary/40" />
    </div>
  );
}
