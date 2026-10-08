"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { downloadAttendanceSheetPdf } from "@/frontend/lib/attendance-sheet-pdf";
import { Input } from "@/frontend/components/ui/Field";
import { PageHeader, Tabs } from "@/frontend/components/ui/Page";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { DAY_LABELS, formatRange } from "@/shared/lib/time";
import { cn } from "@/shared/lib/utils";
import { ArrowLeft, ChevronDown, ClipboardList, Download, LoaderCircle, Search, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type Status = "present" | "late" | "absent";
type Session = {
  id: string;
  status: "active" | "closed";
  startedAt: string;
  endedAt: string | null;
  enrolledCount: number;
  attendance: { id: string; studentNumber: string; studentName: string; checkedInAt: string; status: "present" | "late" }[];
};
type RosterEntry = { studentNumber: string; studentName: string };
type Tab = "students" | "history";

const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const statusTone = { present: "ok", late: "warn", absent: "danger" } as const;
const statusLabel = { present: "Present", late: "Late", absent: "Absent" } as const;

export default function TeacherSubjectPage() {
  const { sectionId, subjectId } = useParams<{ sectionId: string; subjectId: string }>();
  const { sections, scheduleSlots, getSubject, getRoomName, currentUser } = useAcademicStore();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("students");
  const [query, setQuery] = useState("");
  const [openSession, setOpenSession] = useState<string | null>(null);
  const [report, setReport] = useState<{ teacher: string; term: string }>({ teacher: "", term: "" });
  const [downloading, setDownloading] = useState(false);

  const section = sections.find((item) => item.id === sectionId);
  const subject = getSubject(subjectId);
  const teacherId = currentUser?.role === "teacher" ? currentUser.teacherId : undefined;
  const meetings = scheduleSlots.filter((slot) => slot.sectionId === sectionId && slot.subjectId === subjectId && slot.teacherId === teacherId);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams({ sectionId, subjectId });
    fetch(`/api/teacher/attendance-history?${params}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load attendance.");
        if (!active) return;
        setSessions(result.sessions as Session[]);
        setRoster((result.report?.roster ?? []) as RosterEntry[]);
        setReport({ teacher: result.report?.teacher ?? "", term: result.report?.term ?? "" });
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load attendance."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [sectionId, subjectId]);

  // Per-student totals over finished sessions; late counts as attended.
  const closed = useMemo(() => sessions.filter((session) => session.status === "closed"), [sessions]);
  const students = useMemo(() => roster.map((student) => {
    let present = 0;
    let late = 0;
    for (const session of closed) {
      const record = session.attendance.find((item) => item.studentNumber === student.studentNumber);
      if (record?.status === "late") late += 1;
      else if (record) present += 1;
    }
    const absent = closed.length - present - late;
    return { ...student, present, late, absent, rate: closed.length ? Math.round(((present + late) / closed.length) * 100) : null };
  }), [roster, closed]);
  const shown = students.filter((student) => `${student.studentName} ${student.studentNumber}`.toLowerCase().includes(query.trim().toLowerCase()));
  const live = sessions.find((session) => session.status === "active");
  const average = students.length && closed.length
    ? Math.round(students.reduce((sum, student) => sum + (student.rate ?? 0), 0) / students.length)
    : null;

  async function downloadPdf() {
    setDownloading(true);
    setError("");
    try {
      const slug = (value: string) => value.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase();
      await downloadAttendanceSheetPdf({
        subjectCode: subject?.code ?? "",
        subjectName: subject?.name ?? "Subject",
        sectionName: section?.name ?? "Section",
        teacher: report.teacher || currentUser?.name || "",
        term: report.term,
        roster,
        sessions,
        fileName: `attendance-${slug(`${subject?.code ?? "subject"}-${section?.name ?? "section"}`)}.pdf`,
      });
    } catch (cause) {
      console.error("Attendance PDF export failed:", cause);
      setError("Could not create the attendance PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  return <div>
    <Link href={`/teacher/sections/${sectionId}`} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-accent"><ArrowLeft className="h-4 w-4" />{section?.name ?? "Section"}</Link>
    <PageHeader
      title={subject ? `${subject.code} · ${subject.name}` : "Subject"}
      description={[
        section ? `${section.name} · ${section.program} · ${section.yearLevel}` : "",
        meetings.map((slot) => `${DAY_LABELS.find((day) => day.id === slot.dayOfWeek)?.label ?? ""} ${formatRange(slot.startTime, slot.endTime)}${slot.modality === "online" ? " · Online" : ` · ${getRoomName(slot.roomId) ?? "Room"}`}`).join("  |  "),
      ].filter(Boolean).join("  —  ")}
      actions={<>
        {live ? <Link href={`/teacher/attendance/${live.id}`} className="inline-flex items-center gap-2 rounded-lg border border-ok/30 bg-ok-soft px-3 py-2 text-sm font-semibold text-ok hover:border-ok/60"><span className="h-2 w-2 animate-pulse rounded-full bg-ok" />Attendance open · view live list</Link> : null}
        <Button type="button" onClick={() => void downloadPdf()} disabled={loading || downloading || !sessions.length} title={!loading && !sessions.length ? "No attendance sessions to export yet" : undefined}>
          {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {downloading ? "Creating PDF..." : "Download PDF"}
        </Button>
      </>}
    />

    {error ? <p role="alert" className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

    <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Students" value={loading ? "—" : roster.length} />
      <Stat label="Sessions held" value={loading ? "—" : closed.length} />
      <Stat label="Average attendance" value={loading || average === null ? "—" : `${average}%`} />
      <Stat label="Last session" value={loading || !sessions[0] ? "—" : new Date(sessions[0].startedAt).toLocaleDateString([], { month: "short", day: "numeric" })} />
    </div>

    <Tabs
      tabs={[
        { id: "students" as const, label: "Students", count: roster.length },
        { id: "history" as const, label: "Attendance history", count: sessions.length },
      ]}
      value={tab}
      onChange={setTab}
    />

    {loading ? <div className="space-y-2">{[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-xl bg-bg-elevated" />)}</div>
      : tab === "students" ? <section className="overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <p className="text-sm text-ink-muted">{closed.length ? `Totals over ${closed.length} finished ${closed.length === 1 ? "session" : "sessions"}. Late counts as attended.` : "No finished attendance sessions yet."}</p>
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-muted" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name or student no." className="h-9 pl-9" />
          </div>
        </div>
        {roster.length === 0 ? <Empty icon={<Users className="h-8 w-8" />} title="No students enrolled" text="Ask the administrator to import this section's roster." />
          : <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-bg text-xs uppercase tracking-wide text-ink-muted"><tr>
              <th className="px-5 py-2.5 font-medium">#</th>
              <th className="px-3 py-2.5 font-medium">Student</th>
              <th className="px-3 py-2.5 text-center font-medium">Present</th>
              <th className="px-3 py-2.5 text-center font-medium">Late</th>
              <th className="px-3 py-2.5 text-center font-medium">Absent</th>
              <th className="px-5 py-2.5 font-medium">Attendance</th>
            </tr></thead>
            <tbody className="divide-y divide-line/70">
              {shown.map((student) => <tr key={student.studentNumber} className="hover:bg-bg/60">
                <td className="px-5 py-3 font-mono text-xs text-ink-muted">{students.indexOf(student) + 1}</td>
                <td className="px-3 py-3"><p className="font-medium text-ink">{student.studentName}</p><p className="font-mono text-xs text-ink-muted">{student.studentNumber}</p></td>
                <td className="px-3 py-3 text-center font-semibold text-ok">{student.present}</td>
                <td className="px-3 py-3 text-center font-semibold text-warn">{student.late}</td>
                <td className="px-3 py-3 text-center font-semibold text-danger">{student.absent}</td>
                <td className="px-5 py-3">{student.rate === null ? <span className="text-ink-muted">—</span> : <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-bg"><div className={cn("h-full rounded-full", student.rate < 80 ? "bg-warn" : "bg-ok")} style={{ width: `${student.rate}%` }} /></div>
                  <span className="font-mono text-xs text-ink">{student.rate}%</span>
                </div>}</td>
              </tr>)}
              {!shown.length ? <tr><td colSpan={6} className="px-5 py-8 text-center text-sm text-ink-muted">No students match “{query}”.</td></tr> : null}
            </tbody>
          </table></div>}
      </section>
      : sessions.length === 0 ? <section className="rounded-2xl border border-line bg-bg-elevated"><Empty icon={<ClipboardList className="h-8 w-8" />} title="No attendance taken yet" text="Start attendance from the teacher mobile app. Each session will be listed here." /></section>
      : <div className="space-y-2.5">
        {sessions.map((session) => {
          const date = new Date(session.startedAt);
          const late = session.attendance.filter((item) => item.status === "late").length;
          const present = session.attendance.length - late;
          const enrolled = session.enrolledCount || roster.length;
          const absent = Math.max(0, enrolled - session.attendance.length);
          const expanded = openSession === session.id;
          const byNumber = new Map(session.attendance.map((item) => [item.studentNumber, item]));
          return <article key={session.id} className="overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm">
            <button type="button" onClick={() => setOpenSession(expanded ? null : session.id)} aria-expanded={expanded} className="flex w-full flex-wrap items-center gap-4 px-4 py-3.5 text-left transition hover:bg-bg/60 sm:flex-nowrap">
              <span className="grid w-14 shrink-0 place-items-center rounded-xl bg-bg py-1.5 text-center">
                <span className="font-mono text-[10px] uppercase text-ink-muted">{date.toLocaleDateString([], { month: "short" })}</span>
                <span className="text-xl font-bold leading-none text-ink">{date.getDate()}</span>
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2"><span className="font-semibold text-ink">{date.toLocaleDateString([], { weekday: "long" })}</span>{session.status === "active" ? <Badge tone="ok" dot>Live</Badge> : null}</span>
                <span className="block text-xs text-ink-muted">{time(session.startedAt)} – {session.endedAt ? time(session.endedAt) : "ongoing"}</span>
              </span>
              <span className="flex items-center gap-2 text-xs font-semibold">
                <span className="rounded-full bg-ok-soft px-2.5 py-1 text-ok">{present} present</span>
                <span className="rounded-full bg-warn-soft px-2.5 py-1 text-warn">{late} late</span>
                <span className="rounded-full bg-danger-soft px-2.5 py-1 text-danger">{absent} {session.status === "active" ? "not yet" : "absent"}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 text-ink-muted transition", expanded && "rotate-180")} />
            </button>
            {expanded ? <div className="border-t border-line">
              {roster.length ? <ul className="grid divide-y divide-line/60 sm:grid-cols-2 sm:divide-y-0">
                {roster.map((student) => {
                  const record = byNumber.get(student.studentNumber);
                  const status: Status = record?.status ?? "absent";
                  return <li key={student.studentNumber} className="flex items-center gap-3 px-4 py-2.5 sm:border-b sm:border-line/60">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{student.studentName}</span><span className="font-mono text-[11px] text-ink-muted">{student.studentNumber}{record ? ` · ${time(record.checkedInAt)}` : ""}</span></span>
                    {session.status === "active" && !record ? <span className="text-xs text-ink-muted">Not yet</span> : <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>}
                  </li>;
                })}
              </ul> : <p className="px-4 py-4 text-sm text-ink-muted">No roster to compare against.</p>}
            </div> : null}
          </article>;
        })}
      </div>}
  </div>;
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="rounded-2xl border border-line bg-bg-elevated px-4 py-3.5 shadow-sm">
    <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted">{label}</p>
    <p className="mt-1.5 font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-ink">{value}</p>
  </div>;
}

function Empty({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="px-6 py-12 text-center text-ink-muted">
    <span className="mx-auto flex w-fit">{icon}</span>
    <p className="mt-3 text-sm font-semibold text-ink">{title}</p>
    <p className="mt-1 text-sm">{text}</p>
  </div>;
}
