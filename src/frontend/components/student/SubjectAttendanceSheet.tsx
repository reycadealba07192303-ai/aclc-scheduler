"use client";

import { cn } from "@/shared/lib/utils";
import { Check, ClipboardList, Clock3, QrCode, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

type SessionResult = "present" | "late" | "absent" | "open";

export type SubjectAttendance = {
  subject: { code: string; name: string };
  summary: { held: number; present: number; late: number; absent: number };
  sessions: { id: string; startedAt: string; endedAt: string | null; teacher: string; checkedInAt: string | null; result: SessionResult }[];
};

const time = (value: string) => new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

/** Side drawer (bottom sheet on phones) with the student's attendance for one subject. */
export function SubjectAttendanceSheet({
  subject,
  teacher,
  onClose,
  data: preloaded,
}: {
  subject: { id: string; code: string; name: string };
  teacher: string;
  onClose: () => void;
  /** Skips fetching; used for previews. */
  data?: SubjectAttendance;
}) {
  const [data, setData] = useState<SubjectAttendance | null>(preloaded ?? null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (preloaded) return;
    let active = true;
    fetch(`/api/student/attendance/${subject.id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Could not load attendance for this subject.");
        if (active) setData(result as SubjectAttendance);
      })
      .catch((cause: unknown) => { if (active) setError(cause instanceof Error ? cause.message : "Could not load attendance for this subject."); });
    return () => { active = false; };
  }, [subject.id, preloaded]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  // Late still counts as attended.
  const attended = data ? data.summary.present + (data.summary.late ?? 0) : 0;
  const rate = data && data.summary.held ? Math.round((attended / data.summary.held) * 100) : null;

  return <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-stretch sm:justify-end" role="dialog" aria-modal="true" aria-label={`${subject.code} attendance`}>
    <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-[#070d1f]/45 backdrop-blur-[2px]" />
    <div className="relative flex max-h-[88vh] w-full flex-col overflow-hidden rounded-t-3xl bg-bg-elevated shadow-2xl sm:h-full sm:max-h-none sm:max-w-md sm:rounded-none sm:rounded-l-3xl">
      <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-line sm:hidden" />
      <header className="flex items-start gap-3 border-b border-line px-6 pb-5 pt-4 sm:pt-6">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-xs font-medium tracking-wide text-accent">{subject.code}</p>
          <h2 className="mt-1 font-[family-name:var(--font-display)] text-xl font-bold leading-tight tracking-tight text-ink">{subject.name}</h2>
          <p className="mt-1 text-sm text-ink-muted">{teacher}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded-xl p-2 text-ink-muted transition hover:bg-bg hover:text-ink"><X className="h-5 w-5" /></button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-5">
        {error ? <p role="alert" className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p>
          : !data ? <div className="space-y-3">{[0, 1, 2, 3].map((item) => <div key={item} className="h-14 animate-pulse rounded-2xl bg-bg" />)}</div>
          : <>
            <section className="rounded-2xl border border-line p-4">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted">Attendance rate</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-ink">{rate === null ? "—" : `${rate}%`}</p>
                </div>
                <p className="pb-1 text-right text-sm text-ink-muted">{attended} of {data.summary.held} {data.summary.held === 1 ? "session" : "sessions"} attended</p>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-bg">
                <div className={cn("h-full rounded-full", rate !== null && rate < 80 ? "bg-warn" : "bg-ok")} style={{ width: `${rate ?? 0}%` }} />
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-ok-soft/70 py-2"><p className="text-lg font-bold text-ok">{data.summary.present}</p><p className="text-[11px] font-medium text-ok/80">Present</p></div>
                <div className="rounded-xl bg-warn-soft/70 py-2"><p className="text-lg font-bold text-warn">{data.summary.late ?? 0}</p><p className="text-[11px] font-medium text-warn/80">Late</p></div>
                <div className="rounded-xl bg-danger-soft/70 py-2"><p className="text-lg font-bold text-danger">{data.summary.absent}</p><p className="text-[11px] font-medium text-danger/80">Absent</p></div>
              </div>
            </section>

            <h3 className="mb-2 mt-6 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">Sessions</h3>
            {data.sessions.length ? <ul className="space-y-2">
              {data.sessions.map((session) => {
                const date = new Date(session.startedAt);
                return <li key={session.id} className="flex items-center gap-3 rounded-2xl border border-line px-3.5 py-3">
                  <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-bg py-1.5 text-center">
                    <span className="font-mono text-[10px] uppercase text-ink-muted">{date.toLocaleDateString([], { month: "short" })}</span>
                    <span className="text-lg font-bold leading-none text-ink">{date.getDate()}</span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{date.toLocaleDateString([], { weekday: "long" })}</span>
                    <span className="block truncate text-xs text-ink-muted">Started {time(session.startedAt)}</span>
                    {session.checkedInAt ? <span className="block truncate text-xs text-ok">Checked in {time(session.checkedInAt)}</span> : null}
                  </span>
                  <ResultPill result={session.result} />
                </li>;
              })}
            </ul> : <div className="rounded-2xl border border-dashed border-line px-5 py-10 text-center">
              <ClipboardList className="mx-auto h-8 w-8 text-ink-muted" />
              <p className="mt-3 text-sm font-semibold text-ink">No attendance taken yet</p>
              <p className="mt-1 text-sm text-ink-muted">Sessions appear here once your teacher starts attendance for this subject.</p>
            </div>}
          </>}
      </div>
    </div>
  </div>;
}

function ResultPill({ result }: { result: SessionResult }) {
  if (result === "open") {
    return <Link href="/student/attendance" className="inline-flex shrink-0 items-center gap-1 rounded-full bg-info-soft px-2.5 py-1 text-xs font-semibold text-info hover:underline"><QrCode className="h-3.5 w-3.5" />Show QR</Link>;
  }
  if (result === "late") {
    return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-semibold text-warn"><Clock3 className="h-3.5 w-3.5" strokeWidth={2.5} />Late</span>;
  }
  return result === "present"
    ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2.5 py-1 text-xs font-semibold text-ok"><Check className="h-3.5 w-3.5" strokeWidth={3} />Present</span>
    : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-danger"><X className="h-3.5 w-3.5" strokeWidth={3} />Absent</span>;
}
