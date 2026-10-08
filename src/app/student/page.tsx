"use client";

import { SubjectAttendanceSheet } from "@/frontend/components/student/SubjectAttendanceSheet";
import { Badge } from "@/frontend/components/ui/Badge";
import { PageHeader, Panel, StatCard } from "@/frontend/components/ui/Page";
import { DAY_LABELS, formatRange } from "@/shared/lib/time";
import { CalendarDays, ChevronRight, Clock3, MapPin, Monitor, QrCode, UserRound } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type Portal = {
  student: { name: string; studentNumber?: string };
  term: { startYear: number; semester: string } | null;
  section: { name: string; yearLevel: string; program: string } | null;
  classes: { id: string; dayOfWeek: number; startTime: string; endTime: string; modality: "online" | "face_to_face"; subject: { id: string; code: string; name: string; units: number } | null; teacher: string; room: string | null }[];
};
type ActiveAttendance = { id: string; subject: { code: string; name: string }; teacher: string; checkedIn: boolean };

export default function StudentHomePage() {
  const [data, setData] = useState<Portal | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [activeAttendance, setActiveAttendance] = useState<ActiveAttendance[]>([]);
  const [selected, setSelected] = useState<{ subject: { id: string; code: string; name: string }; teacher: string } | null>(null);
  useEffect(() => {
    fetch("/api/student/portal", { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "Could not load classes."); return result as Portal; })
      .then(setData)
      .catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Could not load classes."))
      .finally(() => setLoading(false));
    let mounted = true;
    const loadAttendance = () => fetch("/api/student/attendance-sessions", { cache: "no-store" })
      .then(async (response) => { const result = await response.json(); if (!response.ok) return; if (mounted) setActiveAttendance(result.sessions as ActiveAttendance[]); })
      .catch(() => undefined);
    void loadAttendance();
    const poll = window.setInterval(() => void loadAttendance(), 5000);
    return () => { mounted = false; window.clearInterval(poll); };
  }, []);

  const classes = [...(data?.classes ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime));
  const dayLabel = (day: number) => DAY_LABELS.find((item) => item.id === day)?.long ?? "";
  const termLabel = data?.term ? `A.Y. ${data.term.startYear}-${data.term.startYear + 1} · ${data.term.semester}` : "No current enrollment";

  return <div>
    <PageHeader title={`Welcome, ${data?.student.name ?? "Student"}`} description={`${data?.student.studentNumber ? `${data.student.studentNumber} · ` : ""}${data?.section ? `${data.section.program} · ${data.section.name} · ${data.section.yearLevel}` : "Your enrolled classes and schedule will appear here."} · ${termLabel}`} />
    {error ? <p role="alert" className="mb-5 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    {activeAttendance.length ? <Link href="/student/attendance" className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-ok/25 bg-ok-soft px-4 py-3 transition hover:border-ok/50"><span className="flex min-w-0 items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white text-ok"><QrCode className="h-5 w-5" /></span><span className="min-w-0"><span className="block font-semibold text-ink">Attendance is open now</span><span className="block truncate text-sm text-ink-muted">{activeAttendance.map((session) => session.subject.code).join(", ")} · show your student QR</span></span></span><span className="shrink-0 text-sm font-semibold text-ok">Open attendance →</span></Link> : null}
    {loading ? <div className="rounded-xl border border-line bg-bg-elevated px-5 py-10 text-center text-sm text-ink-muted">Loading your classes...</div> : !data?.section ? <div className="rounded-2xl border border-dashed border-line bg-bg-elevated px-6 py-16 text-center"><CalendarDays className="mx-auto h-10 w-10 text-accent" /><h2 className="mt-4 font-semibold text-ink">No section enrollment found</h2><p className="mt-1 text-sm text-ink-muted">Ask your school administrator to add you to a section roster.</p></div> : <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Enrolled section" value={data.section.name} hint={`${data.section.program} · ${data.section.yearLevel}`} icon={<UserRound className="h-5 w-5" />} />
        <StatCard label="Classes this term" value={classes.length} hint={data.term?.semester ?? ""} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Online classes" value={classes.filter((item) => item.modality === "online").length} hint="No classroom required" icon={<Monitor className="h-5 w-5" />} />
      </div>
      <Panel title="My class schedule" action={classes.length ? <span className="text-xs text-ink-muted">Select a class to see your attendance</span> : undefined}>
        {classes.length ? <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm"><thead><tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted"><th className="pb-3 pl-2 font-semibold">Day</th><th className="pb-3 font-semibold">Time</th><th className="pb-3 font-semibold">Subject</th><th className="pb-3 font-semibold">Teacher</th><th className="pb-3 font-semibold">Class type & location</th><th className="pb-3"><span className="sr-only">Attendance</span></th></tr></thead><tbody className="divide-y divide-line/60">{classes.map((item) => <tr key={item.id} tabIndex={item.subject ? 0 : -1} onClick={() => { if (item.subject) setSelected({ subject: item.subject, teacher: item.teacher }); }} onKeyDown={(event) => { if (item.subject && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); setSelected({ subject: item.subject, teacher: item.teacher }); } }} className={item.subject ? "group cursor-pointer transition hover:bg-accent-soft/50 focus-visible:bg-accent-soft/50 focus-visible:outline-none" : undefined}><td className="py-3 pl-2 font-semibold">{dayLabel(item.dayOfWeek)}</td><td className="py-3"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-ink-muted" />{formatRange(item.startTime, item.endTime)}</span></td><td className="py-3">{item.subject ? <><span className="font-semibold text-accent">{item.subject.code}</span><span className="ml-2 text-ink-muted">{item.subject.name}</span></> : "Subject unavailable"}</td><td className="py-3">{item.teacher}</td><td className="py-3"><div className="flex items-center gap-2"><Badge tone={item.modality === "online" ? "info" : "accent"}>{item.modality === "online" ? "Online" : "Face-to-face"}</Badge><span className="text-ink-muted">{item.modality === "online" ? "Online class" : <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{item.room ?? "Room not listed"}</span>}</span></div></td><td className="py-3 pr-2 text-right">{item.subject ? <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-xs font-semibold text-accent opacity-70 transition group-hover:opacity-100">Attendance<ChevronRight className="h-4 w-4" /></span> : null}</td></tr>)}</tbody></table></div> : <p className="text-sm text-ink-muted">No class times have been published for your section yet.</p>}
      </Panel>
    </>}
    {selected ? <SubjectAttendanceSheet subject={selected.subject} teacher={selected.teacher} onClose={() => setSelected(null)} /> : null}
  </div>;
}
