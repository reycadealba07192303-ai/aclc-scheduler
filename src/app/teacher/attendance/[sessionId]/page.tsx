"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Button } from "@/frontend/components/ui/Button";
import { PageHeader, Panel, StatCard } from "@/frontend/components/ui/Page";
import { ArrowLeft, CheckCircle2, Clock3, LoaderCircle, QrCode, UserCheck, XCircle } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { startVisiblePolling } from "@/frontend/hooks/usePolling";

type SessionDetails = {
  session: { id: string; status: "active" | "closed"; startedAt: string; endedAt: string | null; section: string; subject: string; teacher: string };
  attendance: { id: string; studentNumber: string; studentName: string; checkedInAt: string; status: string }[];
};

export default function TeacherAttendanceSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SessionDetails | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/teacher/attendance-sessions/${sessionId}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not load this attendance session.");
    setData(result as SessionDetails);
    setError("");
  }, [sessionId]);

  useEffect(() => {
    let mounted = true;
    const refresh = async () => {
      try {
        await load();
      } catch (cause) {
        if (mounted) setError(cause instanceof Error ? cause.message : "Could not load this session.");
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void refresh();
    // Live check-in list: stays quick, but pauses while the tab is hidden.
    const stop = startVisiblePolling(() => { if (mounted) void refresh(); }, 3000);
    return () => { mounted = false; stop(); };
  }, [load]);

  async function closeSession() {
    if (!window.confirm("Close attendance for this class? Students will no longer be able to check in.")) return;
    setClosing(true);
    setError("");
    try {
      const response = await fetch(`/api/teacher/attendance-sessions/${sessionId}/close`, { method: "POST" });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Could not close attendance.");
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not close attendance.");
    } finally {
      setClosing(false);
    }
  }

  return <div>
    <Link href="/teacher" onClick={(event) => { event.preventDefault(); router.back(); }} className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-ink-muted hover:text-accent"><ArrowLeft className="h-4 w-4" /> Back to section</Link>
    <PageHeader title="Class attendance" description={data ? `${data.session.subject} · ${data.session.section} · Started ${new Date(data.session.startedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : "Scan student QR codes with the ACLC Scheduler mobile app."} actions={data?.session.status === "active" ? <Button variant="danger" type="button" onClick={() => void closeSession()} disabled={closing}>{closing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}{closing ? "Closing..." : "Close attendance"}</Button> : null} />
    {error ? <p role="alert" className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{error}</p> : null}
    {loading && !data ? <div className="rounded-xl border border-line bg-bg-elevated p-8 text-center text-sm text-ink-muted">Loading attendance...</div> : data ? <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Attendance status" value={data.session.status === "active" ? "Open" : "Closed"} icon={data.session.status === "active" ? <CheckCircle2 className="h-5 w-5 text-ok" /> : <XCircle className="h-5 w-5" />} />
        <StatCard label="Students checked in" value={data.attendance.length} icon={<UserCheck className="h-5 w-5" />} />
        <StatCard label="Student QR" value={data.session.status === "active" ? "Live" : "Stopped"} hint="Rotates every 10 seconds" icon={<Clock3 className="h-5 w-5" />} />
      </div>
      <div className="grid gap-5 xl:grid-cols-[360px_minmax(0,1fr)]">
        <Panel title="Teacher QR scanner">
          <div className="flex flex-col items-center rounded-xl border border-line bg-bg-elevated px-5 py-10 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><QrCode className="h-7 w-7" /></span>
            <p className="mt-4 font-semibold text-ink">Scan from the teacher mobile app</p>
            <p className="mt-2 max-w-xs text-sm leading-6 text-ink-muted">Students show their personal attendance QR on their portal. Open this class in ACLC Scheduler mobile to scan it and record attendance.</p>
            <p className="mt-4 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted">Student code refreshes every 10 seconds</p>
          </div>
        </Panel>
        <Panel title="Checked-in students" action={<Badge tone="info">{data.attendance.length} present</Badge>}>
          {data.attendance.length ? <div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[460px] text-left text-sm"><thead className="sticky top-0 bg-bg text-xs uppercase tracking-wide text-ink-muted"><tr><th className="px-3 py-2.5">Student number</th><th className="px-3 py-2.5">Student</th><th className="px-3 py-2.5">Check-in time</th><th className="px-3 py-2.5">Status</th></tr></thead><tbody className="divide-y divide-line/60">{data.attendance.map((record) => <tr key={record.id}><td className="px-3 py-3 font-semibold text-accent">{record.studentNumber}</td><td className="px-3 py-3">{record.studentName}</td><td className="px-3 py-3">{new Date(record.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}</td><td className="px-3 py-3">{record.status === "late" ? <Badge tone="warn">Late</Badge> : <Badge tone="ok">Present</Badge>}</td></tr>)}</tbody></table></div> : <div className="py-14 text-center"><UserCheck className="mx-auto h-9 w-9 text-ink-muted" /><p className="mt-3 font-semibold text-ink">Waiting for check-ins</p><p className="mt-1 text-sm text-ink-muted">Students who show their live QR to the teacher will appear here.</p></div>}
        </Panel>
      </div>
    </> : null}
  </div>;
}
