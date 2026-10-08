"use client";

import { AppShell, type NavItem } from "@/frontend/components/layout/AppShell";
import { CalendarDays, ClipboardCheck, UserRound } from "lucide-react";
import { useEffect, useState } from "react";

const nav: NavItem[] = [
  { href: "/student", label: "My classes", icon: CalendarDays },
  { href: "/student/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/student/profile", label: "Profile", icon: UserRound },
];

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [name, setName] = useState("Student");
  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((response) => response.json())
      .then((result) => { if (result.user?.role === "student") setName(result.user.name); })
      .catch(() => undefined);
  }, []);
  return <AppShell subtitle="Student Portal" nav={nav} userLabel={name} userRole="Student" >{children}</AppShell>;
}
