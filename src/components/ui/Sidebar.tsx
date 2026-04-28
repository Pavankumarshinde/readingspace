"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserRole } from "@/types";
import {
  DoorOpen,
  LayoutDashboard,
  User,
  Grid2X2,
  BookOpen,
} from "lucide-react";

const navItems = [
  // Manager Tabs
  {
    label: "My Rooms",
    href: "/manager/rooms",
    icon: DoorOpen,
    role: "manager" as const,
  },
  {
    label: "Profile",
    href: "/manager/profile",
    icon: User,
    role: "manager" as const,
  },

  // Student Tabs
  {
    label: "Rooms",
    href: "/student/rooms",
    icon: Grid2X2,
    role: "student" as const,
  },
  {
    label: "My Space",
    href: "/student/my-space",
    icon: LayoutDashboard,
    role: "student" as const,
  },
  {
    label: "Profile",
    href: "/student/profile",
    icon: User,
    role: "student" as const,
  },
];

export default function Sidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const filteredItems = navItems.filter(
    (item) =>
      (item.role as string) === (role as string) ||
      (item.role as string) === "all",
  );

  return (
    <aside className="hidden md:flex flex-col h-dvh sticky top-0 bg-surface-container-low transition-all duration-300 w-[200px] shrink-0 overflow-y-auto border-r border-outline-variant/10">
      {/* Brand Header */}
      <div className="px-6 pt-6 pb-4 flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <BookOpen size={18} strokeWidth={2.5} />
        </div>
        <h1 className="font-headline text-xl font-semibold text-primary tracking-tight">
          ReadingSpace
        </h1>
      </div>

      {/* Nav Items */}
      <nav className="scroll-area mt-4 space-y-0.5">
        {filteredItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href === "/student/rooms" &&
              pathname.startsWith("/student/rooms")) ||
            (item.href === "/manager/rooms" &&
              pathname.startsWith("/manager/rooms")) ||
            (item.href === "/student/my-space" &&
              pathname.startsWith("/student/my-space"));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 transition-all relative group ${
                isActive
                  ? "text-primary"
                  : "text-on-surface-variant/60 hover:text-on-surface"
              }`}
            >
              {isActive && (
                <div className="absolute left-0 w-[3px] h-5 bg-primary rounded-r-full" />
              )}
              <item.icon
                className={isActive ? "" : "opacity-50 group-hover:opacity-100"}
                size={16}
              />
              <span className="text-[13px] font-semibold tracking-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 shrink-0">
        <div className="text-[9px] uppercase font-bold tracking-widest text-on-surface-variant/30">
          v0.1.0
        </div>
      </div>
    </aside>
  );
}
