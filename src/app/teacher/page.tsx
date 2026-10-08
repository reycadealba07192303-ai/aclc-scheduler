"use client";

import { PageHeader, Panel, StatCard, Tabs } from "@/frontend/components/ui/Page";
import { ScheduleGrid } from "@/frontend/components/schedule/ScheduleGrid";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { DAY_LABELS, formatRange, formatTime } from "@/shared/lib/time";
import { Button } from "@/frontend/components/ui/Button";
import { downloadWeeklySchedulePdf } from "@/frontend/lib/weekly-schedule-pdf";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Download, LoaderCircle, Monitor, Users } from "lucide-react";
import { useState } from "react";

// Monday first, Sunday last.
const dayOrder = (day: number) => (day === 0 ? 7 : day);

export default function TeacherSchedulePage() {
  const { activeTerm, currentUser, setupLoading, scheduleSlots, sections, teachers, getSubject, getRoomName } = useAcademicStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const [view, setView] = useState<"classes" | "week">("classes");
  const teacherId = currentUser?.role === "teacher" ? currentUser.teacherId ?? "" : "";
  const selectedTeacher = teachers.find((teacher) => teacher.id === teacherId);

  const mine = scheduleSlots
    .filter((s) => s.teacherId === teacherId && (!activeTerm || sections.some((section) => section.id === s.sectionId)))
    .sort(
      (a, b) =>
        dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) ||
        a.startTime.localeCompare(b.startTime),
    );
  const handledSections = sections
    .map((section) => ({ section, classes: mine.filter((slot) => slot.sectionId === section.id) }))
    .filter((item) => item.classes.length > 0)
    .sort((a, b) => a.section.name.localeCompare(b.section.name));

  const dayLabel = (id: number) => DAY_LABELS.find((d) => d.id === id)?.label ?? "";

  const downloadSchedulePdf = async () => {
    if (!selectedTeacher || !activeTerm || mine.length === 0) return;
    setIsDownloading(true);
    setDownloadError("");

    try {
      const teacherName = `${selectedTeacher.firstName} ${selectedTeacher.lastName}`;
      const fileSlug = (value: string) => value.normalize("NFKD").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      await downloadWeeklySchedulePdf({
        heading: "ACLC COLLEGE  |  TEACHER CLASS SCHEDULE",
        title: teacherName,
        subtitle: `A.Y. ${activeTerm.startYear}-${activeTerm.startYear + 1}  |  ${activeTerm.semester}`,
        classes: mine.map((slot) => {
          const subject = getSubject(slot.subjectId);
          const section = sections.find((item) => item.id === slot.sectionId);
          return {
            dayOfWeek: slot.dayOfWeek,
            startTime: slot.startTime,
            endTime: slot.endTime,
            title: subject?.code ?? "Class",
            online: slot.modality === "online",
            lines: [
              section?.name ?? "Section",
              subject?.name ?? "",
              slot.modality === "online" ? "Online" : getRoomName(slot.roomId) ?? "Room unavailable",
              `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`,
            ],
          };
        }),
        fileName: `class-schedule-${fileSlug(teacherName)}-${activeTerm.startYear}-${fileSlug(activeTerm.semester)}.pdf`,
      });
    } catch (error) {
      console.error("Schedule PDF export failed:", error);
      setDownloadError("Could not create the PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Handled classes"
        description={`${selectedTeacher ? `${selectedTeacher.firstName} ${selectedTeacher.lastName} · ` : ""}${activeTerm ? `A.Y. ${activeTerm.startYear}–${activeTerm.startYear + 1} · ${activeTerm.semester}` : "No active term"}. Only classes assigned to this teacher are shown.`}
        actions={
          <Button
            type="button"
            onClick={() => void downloadSchedulePdf()}
            disabled={setupLoading || isDownloading || mine.length === 0}
          >
            {isDownloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {isDownloading ? "Creating PDF..." : "Download PDF"}
          </Button>
        }
      />

      {downloadError ? (
        <p className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger" role="alert">
          {downloadError}
        </p>
      ) : null}

      {setupLoading ? (
        <div className="rounded-xl border border-line bg-bg-elevated px-5 py-8 text-center text-sm text-ink-muted" role="status">
          Loading your schedule…
        </div>
      ) : mine.length === 0 ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-bg-elevated/60 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <CalendarDays className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
            No classes assigned yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            Classes will show up here once the admin schedules them for you.
          </p>
        </div>
      ) : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <StatCard label="Classes this term" value={mine.length} icon={<CalendarDays className="h-5 w-5" />} />
            <StatCard label="Sections" value={new Set(mine.map((slot) => slot.sectionId)).size} icon={<Users className="h-5 w-5" />} />
            <StatCard label="Online classes" value={mine.filter((slot) => slot.modality === "online").length} icon={<Monitor className="h-5 w-5" />} />
          </div>
          <Tabs tabs={[{ id: "classes", label: "Handled classes", count: mine.length }, { id: "week", label: "Weekly schedule" }]} value={view} onChange={setView} />
          {view === "week" ? <Panel title="Weekly schedule"><ScheduleGrid items={mine} showTeacher={false} /></Panel> : <Panel title="Sections you handle">
            <div className="grid gap-3 md:grid-cols-2">
              {handledSections.map(({ section, classes }) => (
                <Link key={section.id} href={`/teacher/sections/${section.id}`} className="group rounded-xl border border-line bg-bg-elevated p-4 transition hover:border-accent/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-[family-name:var(--font-display)] text-lg font-bold text-ink">{section.name}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">{section.program} · {section.yearLevel}</p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent">{classes.length} {classes.length === 1 ? "class" : "classes"}<ArrowUpRight className="h-3.5 w-3.5 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5" /></span>
                  </div>
                  <div className="mt-4 space-y-2 border-t border-line pt-3">
                    {classes.slice(0, 3).map((slot) => {
                      const subject = getSubject(slot.subjectId);
                      return <div key={slot.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate font-medium text-ink">{subject?.code ?? "Class"}<span className="ml-2 font-normal text-ink-muted">{subject?.name}</span></span><span className="shrink-0 text-xs text-ink-muted">{dayLabel(slot.dayOfWeek)} · {formatRange(slot.startTime, slot.endTime)}</span></div>;
                    })}
                    {classes.length > 3 ? <p className="text-xs text-ink-muted">+{classes.length - 3} more scheduled subjects</p> : null}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-accent">Open section and manage attendance <ArrowUpRight className="ml-1 inline h-4 w-4" /></p>
                </Link>
              ))}
            </div>
          </Panel>}
        </>
      )}
    </div>
  );
}
