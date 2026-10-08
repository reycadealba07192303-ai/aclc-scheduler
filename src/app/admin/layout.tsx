"use client";

import { AppShell, type NavItem } from "@/frontend/components/layout/AppShell";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import {
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  UserRound,
  Users,
} from "lucide-react";

const nav: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/programs", label: "Programs & sections", icon: GraduationCap },
  { href: "/admin/schedule", label: "Schedule", icon: CalendarDays },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/setup", label: "Setup", icon: Settings2 },
  { href: "/admin/profile", label: "Profile", icon: UserRound },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAcademicStore();
  return (
    <AppShell
      subtitle="Super Admin"
      nav={nav}
      userLabel={currentUser?.name ?? "Administrator"}
      userRole="Administrator"
    >
      {children}
    </AppShell>
  );
}
