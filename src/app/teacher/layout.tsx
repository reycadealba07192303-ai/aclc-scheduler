"use client";

import { AppShell, type NavItem } from "@/frontend/components/layout/AppShell";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { Building2, CalendarDays, UserRound } from "lucide-react";

const nav: NavItem[] = [
  { href: "/teacher", label: "Handled classes", icon: CalendarDays },
  { href: "/teacher/classrooms", label: "Classrooms", icon: Building2 },
  { href: "/teacher/profile", label: "Profile", icon: UserRound },
];

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAcademicStore();
  return (
    <AppShell
      subtitle="Teacher Portal"
      nav={nav}
      userLabel={currentUser?.name ?? "Teacher"}
      userRole="View only"
    >
      {children}
    </AppShell>
  );
}
