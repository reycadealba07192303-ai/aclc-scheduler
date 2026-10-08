import { cn } from "@/shared/lib/utils";
import { Check, CheckCircle2, Clock3, History, QrCode, ScanLine, Smartphone } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import type { ReactNode } from "react";

export type StudentAttendanceSession = {
  id: string;
  subject: { code: string; name: string };
  teacher: string;
  startedAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  /** "present" or "late" once checked in. */
  status: string | null;
  qr: { value: string; expiresAt: number; validForSeconds: number } | null;
};

export type StudentAttendanceRecord = {
  id: string;
  subjectCode: string;
  subjectName: string;
  section: string;
  teacher: string;
  checkedInAt: string;
  status: string;
};

type Props = {
  student: { name: string; studentNumber: string } | null;
  sessions: StudentAttendanceSession[];
  records: StudentAttendanceRecord[];
  loading: boolean;
  error: string;
  /** Current time in ms; drives the QR refresh countdown. */
  now: number;
};

const timeOf = (value: string, seconds = false) =>
  new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", ...(seconds ? { second: "2-digit" } : {}) });

const dayKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;

function dayHeading(value: string, now: number) {
  const date = new Date(value);
  const today = new Date(now);
  const yesterday = new Date(now);
  yesterday.setDate(today.getDate() - 1);
  if (dayKey(date) === dayKey(today)) return "Today";
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return date.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: date.getFullYear() === today.getFullYear() ? undefined : "numeric" });
}

function startOfWeek(now: number) {
  const date = new Date(now);
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date.getTime();
}

export function StudentAttendanceView({ student, sessions, records, loading, error, now }: Props) {
  const pending = sessions.filter((session) => !session.checkedIn && session.qr);
  const recorded = sessions.filter((session) => session.checkedIn);
  const weekStart = startOfWeek(now);
  const thisWeek = records.filter((record) => new Date(record.checkedInAt).getTime() >= weekStart).length;
  const latest = records[0];

  const groups: { label: string; items: StudentAttendanceRecord[] }[] = [];
  for (const record of records) {
    const label = dayHeading(record.checkedInAt, now);
    const group = groups.at(-1);
    if (group?.label === label) group.items.push(record);
    else groups.push({ label, items: [record] });
  }

  return <div className="mx-auto max-w-5xl">
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">Student portal</p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-[28px] font-bold leading-tight tracking-tight text-ink">Attendance</h1>
        <p className="mt-1 max-w-xl text-sm text-ink-muted">When your teacher opens attendance, your personal QR appears here. Hold it up so they can scan it.</p>
      </div>
      <span className="inline-flex items-center gap-2 rounded-full border border-line bg-bg-elevated px-3 py-1.5 text-xs font-medium text-ink-muted shadow-sm">
        <LiveDot />Updates automatically
      </span>
    </header>

    {error ? <p role="alert" className="mb-5 rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}

    <section aria-label="Open attendance" className="space-y-4">
      {loading ? <div className="h-72 animate-pulse rounded-3xl bg-[#0b1638]/90" /> : <>
        {pending.map((session) => <LiveQrCard key={session.id} session={session} student={student} now={now} />)}
        {recorded.map((session) => <PresentCard key={session.id} session={session} />)}
        {!pending.length && !recorded.length ? <IdleCard /> : null}
      </>}
    </section>

    <div className="mt-6 grid grid-cols-3 gap-3">
      <Stat label="This week" value={loading ? "—" : thisWeek} hint="attended" />
      <Stat label="Recorded" value={loading ? "—" : records.length} hint={records.length >= 100 ? "latest 100" : "check-ins"} />
      <Stat label="Latest" value={loading || !latest ? "—" : timeOf(latest.checkedInAt)} hint={latest ? dayHeading(latest.checkedInAt, now) : "none yet"} />
    </div>

    <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-bg-elevated shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><History className="h-4 w-4 text-ink-muted" />Attendance history</h2>
        {records.length ? <span className="font-mono text-[11px] text-ink-muted">{records.length} CHECK-INS</span> : null}
      </div>
      {loading ? <div className="space-y-3 p-5">{[0, 1, 2].map((item) => <div key={item} className="h-12 animate-pulse rounded-xl bg-bg" />)}</div>
        : groups.length ? <div className="max-h-[560px] divide-y divide-line/70 overflow-y-auto">
          {groups.map((group) => <div key={group.label} className="px-3 py-3 sm:px-4">
            <p className="px-2 pb-1.5 pt-1 font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-ink-muted">{group.label}</p>
            <ul>{group.items.map((record) => <li key={record.id} className="flex items-center gap-3 rounded-xl px-2 py-2.5 transition hover:bg-bg">
              <span className="w-[68px] shrink-0 font-mono text-xs text-ink-muted">{timeOf(record.checkedInAt)}</span>
              <span className="min-w-0 flex-1">
                <span className="flex min-w-0 items-center gap-2">
                  {record.subjectCode ? <CodeChip>{record.subjectCode}</CodeChip> : null}
                  <span className="truncate text-sm font-medium text-ink">{record.subjectName}</span>
                </span>
                <span className="mt-0.5 block truncate text-xs text-ink-muted">{record.section} · {record.teacher}</span>
              </span>
              {record.status === "late"
                ? <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-warn-soft px-2 py-0.5 text-[11px] font-semibold text-warn"><Clock3 className="h-3 w-3" strokeWidth={2.5} /><span className="hidden sm:inline">Late</span></span>
                : <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ok-soft px-2 py-0.5 text-[11px] font-semibold text-ok"><Check className="h-3 w-3" strokeWidth={3} /><span className="hidden sm:inline">Present</span></span>}
            </li>)}</ul>
          </div>)}
        </div>
        : <div className="px-6 py-12 text-center">
          <span className="mx-auto grid h-11 w-11 place-items-center rounded-2xl bg-bg text-ink-muted"><Clock3 className="h-5 w-5" /></span>
          <p className="mt-3 text-sm font-semibold text-ink">No check-ins yet</p>
          <p className="mt-1 text-sm text-ink-muted">Each class your teacher scans you into will be listed here.</p>
        </div>}
    </section>
  </div>;
}

function LiveQrCard({ session, student, now }: { session: StudentAttendanceSession; student: Props["student"]; now: number }) {
  const qr = session.qr!;
  const total = qr.validForSeconds * 1000;
  const remaining = Math.max(0, Math.min(total, qr.expiresAt - now));
  const seconds = Math.ceil(remaining / 1000);
  return <article className="relative overflow-hidden rounded-3xl bg-[#070d1f] text-white shadow-[0_28px_60px_-28px_rgba(15,30,90,0.7)]">
    <div aria-hidden className="pointer-events-none absolute inset-0 [background-image:linear-gradient(rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_at_top_right,black_10%,transparent_70%)]" />
    <div aria-hidden className="pointer-events-none absolute -right-28 -top-36 h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(59,100,224,0.55),transparent_65%)]" />
    <div aria-hidden className="pointer-events-none absolute -bottom-44 -left-36 h-80 w-80 rounded-full bg-[radial-gradient(circle,rgba(203,24,52,0.22),transparent_65%)]" />

    <div className="relative grid gap-7 p-6 sm:p-8 md:grid-cols-[1fr_auto] md:gap-x-10">
      <div className="min-w-0">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-3 py-1 font-mono text-[11px] tracking-wide text-white/85"><LiveDot />ATTENDANCE OPEN</span>
        <p className="mt-5 font-mono text-xs font-medium tracking-wide text-[#b9c9ff]">{session.subject.code}</p>
        <h2 className="mt-1 text-2xl font-semibold leading-tight tracking-tight sm:text-[32px]">{session.subject.name}</h2>
        <p className="mt-2 text-sm text-white/60">{session.teacher} · Started {timeOf(session.startedAt)}</p>
      </div>

      <div className="flex flex-col items-center md:row-span-2 md:self-center">
        <div className="rounded-[22px] bg-white p-3 shadow-2xl shadow-black/40 ring-1 ring-white/20">
          <QRCodeSVG value={qr.value} size={228} level="M" marginSize={2} className="block h-auto w-[min(228px,62vw)]" aria-label="Your attendance QR code" />
        </div>
        <div className="mt-4 w-full max-w-[252px]">
          <div className="flex items-center justify-between font-mono text-[11px] text-white/55"><span>NEW CODE IN</span><span className="tabular-nums text-white/85">{seconds}s</span></div>
          <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-[#6e92ff] to-[#b9c9ff] transition-[width] duration-300 ease-linear" style={{ width: `${(remaining / total) * 100}%` }} />
          </div>
        </div>
        {student ? <div className="mt-4 text-center">
          <p className="text-sm font-medium">{student.name}</p>
          {student.studentNumber ? <p className="font-mono text-xs text-white/50">{student.studentNumber}</p> : null}
        </div> : null}
      </div>

      <ol className="grid gap-2.5 self-end text-sm text-white/75">
        <Step n={1} icon={<Smartphone className="h-4 w-4" />}>Turn up your screen brightness</Step>
        <Step n={2} icon={<ScanLine className="h-4 w-4" />}>Hold the QR up for your teacher to scan</Step>
        <Step n={3} icon={<CheckCircle2 className="h-4 w-4" />}>This card turns green once you&apos;re checked in</Step>
      </ol>
    </div>
  </article>;
}

function PresentCard({ session }: { session: StudentAttendanceSession }) {
  const late = session.status === "late";
  return <article className={cn("flex items-center gap-4 rounded-2xl border p-4 sm:p-5", late ? "border-warn/25 bg-warn-soft/70" : "border-ok/25 bg-ok-soft/70")}>
    <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl text-white shadow-sm", late ? "bg-warn" : "bg-ok")}>{late ? <Clock3 className="h-5 w-5" strokeWidth={2.5} /> : <Check className="h-5 w-5" strokeWidth={3} />}</span>
    <div className="min-w-0 flex-1">
      <p className="font-semibold text-ink">{late ? "You're marked late" : "You're marked present"}</p>
      <p className="truncate text-sm text-ink-muted">{session.subject.code} · {session.subject.name} · {session.teacher}</p>
      {session.checkedInAt ? <p className={cn("mt-0.5 font-mono text-xs sm:hidden", late ? "text-warn" : "text-ok")}>Checked in {timeOf(session.checkedInAt, true)}</p> : null}
    </div>
    {session.checkedInAt ? <span className={cn("hidden shrink-0 rounded-lg bg-white/70 px-2.5 py-1 font-mono text-xs sm:inline", late ? "text-warn" : "text-ok")}>{timeOf(session.checkedInAt, true)}</span> : null}
  </article>;
}

function IdleCard() {
  return <div className="relative overflow-hidden rounded-3xl border border-dashed border-line bg-bg-elevated px-6 py-12 text-center">
    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-soft text-accent"><QrCode className="h-7 w-7" /></span>
    <h2 className="mt-4 text-base font-semibold text-ink">No attendance is open right now</h2>
    <p className="mx-auto mt-1 max-w-sm text-sm text-ink-muted">When your teacher starts attendance for your class, your QR will show up here on its own. You don&apos;t need to refresh.</p>
  </div>;
}

function Stat({ label, value, hint }: { label: string; value: ReactNode; hint: string }) {
  return <div className="min-w-0 rounded-2xl border border-line bg-bg-elevated px-3 py-3.5 shadow-sm sm:px-4">
    <p className="truncate font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-muted">{label}</p>
    <p className="mt-1.5 whitespace-nowrap font-[family-name:var(--font-display)] text-lg font-bold tracking-tight text-ink sm:text-2xl">{value}</p>
    <p className="truncate text-xs text-ink-muted">{hint}</p>
  </div>;
}

function Step({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return <li className="flex items-center gap-3">
    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-white/12 bg-white/[0.06] text-[#b9c9ff]">{icon}</span>
    <span><span className="mr-1.5 font-mono text-[11px] text-white/40">0{n}</span>{children}</span>
  </li>;
}

function CodeChip({ children }: { children: ReactNode }) {
  return <span className="shrink-0 rounded-md bg-accent-soft px-1.5 py-0.5 font-mono text-[11px] font-medium text-accent">{children}</span>;
}

function LiveDot({ className }: { className?: string }) {
  return <span className={cn("relative flex h-2 w-2", className)}>
    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#4ade80] opacity-60" />
    <span className="relative inline-flex h-2 w-2 rounded-full bg-[#22c55e]" />
  </span>;
}
