"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { BookOpen } from "lucide-react";

/**
 * ManagerBrandHeader
 * Fixed top bar for the manager app on mobile, matching the student app style.
 * Shows ReadingSpace logo + name on left, profile avatar (initials) on right.
 * The avatar links to /manager/profile.
 */
export function ManagerBrandHeader() {
  const [initials, setInitials] = useState("MG");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      const user = session?.user;
      if (!user) return;
      const name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "Manager";
      const parts = name.trim().split(" ");
      setInitials(
        parts
          .map((p: string) => p[0])
          .join("")
          .slice(0, 2)
          .toUpperCase(),
      );
    });
  }, []);

  return (
    <header className="bg-surface/95 backdrop-blur-md flex justify-between items-center px-4 pt-[calc(env(safe-area-inset-top,0px)+0.75rem)] pb-3 border-b border-outline-variant/10 md:hidden shrink-0">
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <BookOpen size={16} strokeWidth={2.5} />
        </div>
        <h1 className="font-headline text-lg font-semibold text-primary tracking-tight leading-none">
          ReadingSpace
        </h1>
      </div>
      <Link
        href="/manager/profile"
        className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center border border-outline-variant/30 shrink-0 hover:bg-primary/20 transition-colors"
      >
        <span className="text-[10px] font-bold text-primary">{initials}</span>
      </Link>
    </header>
  );
}
