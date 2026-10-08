"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { PageHeader, Panel } from "@/frontend/components/ui/Page";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { DAY_LABELS, formatRange } from "@/shared/lib/time";
import { ArrowLeft, CalendarDays, ChevronRight, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type ActiveSession = { id: string; scheduleId: string; sectionId: string; startedAt: string; attendanceCount: number };

export default function TeacherSectionPage() {
  const { sectionId } = useParams<{ sectionId: string }>();
  const { setupLoading, currentUser, sections, scheduleSlots, getSubject, getRoomName, activeTerm } = useAcademicStore();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [error, setError] = useState("");
  const section = sections.find((item) => item.id === sectionId);
  const teacherId = currentUser?.role === "teacher" ? currentUser.teacherId : undefined;
  const classes = useMemo(() => scheduleSlots.filter((item) => item.sectionId === sectionId && item.teacherId === teacherId).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime)), [scheduleSlots, sectionId, teacherId]);

  useEffect(() => {
    let mounted = true;
    const loadSessions = () => fetch(`/api/teacher/attendance-sessions?sectionId=${encodeURIComponent(sectionId)}`, { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not load attendance sessions."); return result.sessions as ActiveSession[]; })
      .then((sessions) => { if (mounted) { setActiveSessions(sessions); setError(""); } })
      .catch((cause: unknown) => { if (mounted) setError(cause instanceof Error ? cause.message : "Could not load attendance sessions."); })
      .finally(() => { if (mounted) setLoadingSessions(false); });
    void loadSessions();
    const poll = window.setInterval(() => void loadSessions(), 5000);
    return () => { mounted = false; window.clearInterval(poll); };
  }, [sectionId]);

  if (!setupLoading && !section) return <div className="rounded-xl border border-line bg-bg-elevated p-8 text-center"><h1 className="font-semibold">Section not found in the active term</h1><Link href="/teacher" className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-accent"><ArrowLeft className="h-4 w-4" /> Back to handled sections</Link></div>;

  return <div>
    <Link href="/teacher" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-accent"><ArrowLeft className="h-4 w-4" /> Handled sections</Link>
    <PageHeader title={section?.name ?? "Loading section..."} description={`${section ? `${section.program} · ${section.yearLevel}` : ""}${activeTerm ? ` · A.Y. ${activeTerm.startYear}-${activeTerm.startYear + 1} · ${activeTerm.semester}` : ""}. Open a subject to see its students and attendance history. Attendance is taken with the teacher mobile app.`} />
    {error ? <p role="alert" className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    <Panel title="Subjects and attendance">
      {setupLoading || loadingSessions ? <p className="py-8 text-center text-sm text-ink-muted">Loading your handled classes...</p> : classes.length === 0 ? <div className="py-10 text-center"><CalendarDays className="mx-auto h-8 w-8 text-ink-muted" /><p className="mt-3 text-sm text-ink-muted">No classes are scheduled for this section in the active term.</p></div> : <div className="divide-y divide-line">
        {classes.map((slot) => {
          const subject = getSubject(slot.subjectId);
          const active = activeSessions.find((item) => item.scheduleId === slot.id);
          const day = DAY_LABELS.find((item) => item.id === slot.dayOfWeek)?.long ?? "";
          return <div key={slot.id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-ink">{subject?.code ?? "Subject"}</p><Badge tone={slot.modality === "online" ? "info" : "accent"}>{slot.modality === "online" ? "Online" : "Face-to-face"}</Badge>{active ? <Badge tone="ok">Attendance open</Badge> : null}</div>
              <p className="mt-1 truncate text-sm text-ink-muted">{subject?.name}</p>
              <p className="mt-1 text-xs text-ink-muted">{day} · {formatRange(slot.startTime, slot.endTime)}{slot.modality === "face_to_face" ? ` · ${getRoomName(slot.roomId) ?? "Room not listed"}` : " · Online class"}</p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              {active ? <Link href={`/teacher/attendance/${active.id}`} className="inline-flex items-center gap-2 rounded-lg border border-ok/30 bg-ok-soft px-3 py-2 text-sm font-semibold text-ok hover:border-ok/60"><span className="h-2 w-2 animate-pulse rounded-full bg-ok" />Live · {active.attendanceCount} checked in</Link> : null}
              <Link href={`/teacher/sections/${sectionId}/subjects/${slot.subjectId}`}><Button type="button"><Users className="h-4 w-4" /> View students <ChevronRight className="h-4 w-4 opacity-70" /></Button></Link>
            </div>
          </div>;
        })}
      </div>}
    </Panel>
  </div>;
}
