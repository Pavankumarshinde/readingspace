import BottomNav from "@/components/ui/BottomNav";
import Sidebar from "@/components/ui/Sidebar";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      {/* Responsive Sidebar — Tablet/Laptop (md+) */}
      <Sidebar role="student" />

      {/* Main Content Area */}
      <div className="page-shell flex-1 min-w-0">
        {/*
 No layout-level mobile header here.
 Each student page provides its own <StudentBrandHeader> or
 <StudentRoomHeader> to ensure per-page control of the top bar.
 */}
        <main className="flex-1 overflow-hidden">{children}</main>

        {/* Floating Pill Bottom Nav — Mobile only */}
        <BottomNav role="student" />
      </div>
    </div>
  );
}
