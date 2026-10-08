"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { PageHeader, Panel, StatCard } from "@/frontend/components/ui/Page";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { formatRange } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import {
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  School,
  Users,
} from "lucide-react";
import Link from "next/link";

export default function AdminDashboardPage() {
  const {
    sections,
    activeTerm,
    scheduleSlots,
    programs,
    subjects,
    rooms,
    getSubject,
    getRoomName,
    teachers,
    getTeacherName,
  } = useAcademicStore();

  const todayId = new Date().getDay();
  const today = scheduleSlots
    .filter((s) => s.dayOfWeek === todayId)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
  const dateLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const steps = [
    { label: "Create a term", hint: "Academic year and semester", done: Boolean(activeTerm), href: "/admin/setup#terms" },
    { label: "Add programs", hint: "Courses and strands, like BSIT or STEM", done: programs.length > 0, href: "/admin/programs" },
    { label: "Add subjects", hint: "What you teach", done: subjects.length > 0, href: "/admin/setup" },
    { label: "Create sections", hint: "Choose a program and year level", done: sections.length > 0, href: "/admin/programs" },
    { label: "Schedule classes", hint: "Room, professor, day, and time", done: scheduleSlots.length > 0, href: "/admin/schedule" },
  ];
  const allDone = steps.every((s) => s.done);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={dateLabel}
        actions={
          <>
            <Link href="/admin/schedule">
              <Button>Open schedule</Button>
            </Link>
          </>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Classes scheduled"
          value={scheduleSlots.length}
          hint={`${today.length} today`}
          icon={<BookOpen className="h-5 w-5" />}
        />
        <StatCard
          label="Sections"
          value={sections.length}
          hint={`${programs.length} program${programs.length === 1 ? "" : "s"}`}
          icon={<School className="h-5 w-5" />}
        />
        <StatCard
          label="Rooms"
          value={rooms.length}
          hint="Available for face-to-face"
          icon={<Building2 className="h-5 w-5" />}
        />
        <StatCard
          label="Professors"
          value={teachers.filter((t) => t.status === "active").length}
          hint={`${subjects.length} subject${subjects.length === 1 ? "" : "s"}`}
          icon={<Users className="h-5 w-5" />}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <Panel title="Today’s classes">
          {today.length === 0 ? (
            <p className="py-6 text-center text-sm text-ink-muted">
              No classes scheduled for today.
            </p>
          ) : (
            <ul className="divide-y divide-line/60">
              {today.map((s) => (
                <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3">
                  <span className="w-40 shrink-0 text-sm font-semibold text-ink">
                    {formatRange(s.startTime, s.endTime)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-ink">
                      {getSubject(s.subjectId)?.code}{" "}
                      <span className="font-normal text-ink-muted">
                        · {sections.find((x) => x.id === s.sectionId)?.name}
                      </span>
                    </span>
                    <span className="block text-xs text-ink-muted">
                      {getTeacherName(s.teacherId)}
                    </span>
                  </span>
                  {s.modality === "online" ? (
                    <Badge tone="info">Online</Badge>
                  ) : (
                    <Badge tone="accent">{getRoomName(s.roomId)}</Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title={allDone ? "Setup complete" : "Getting started"}>
          <ol className="space-y-1">
            {steps.map((step, i) => (
              <li key={step.label}>
                <Link
                  href={step.href}
                  className="group flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-bg"
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                      step.done ? "bg-ok text-white" : "bg-line/70 text-ink-muted",
                    )}
                  >
                    {step.done ? <Check className="h-4 w-4" /> : i + 1}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block text-sm font-semibold",
                        step.done ? "text-ink-muted line-through" : "text-ink",
                      )}
                    >
                      {step.label}
                    </span>
                    <span className="block text-xs text-ink-muted">{step.hint}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-ink-muted opacity-0 transition group-hover:opacity-100" />
                </Link>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
