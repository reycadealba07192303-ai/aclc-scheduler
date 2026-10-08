import { PageHeader, Panel } from "@/components/ui/Page";
import { AttendanceBadge } from "@/components/ui/StatusBadges";

const history = [
  {
    id: "1",
    date: "2026-10-05",
    subject: "IT312 · Web Systems Integration",
    status: "present" as const,
    time: "08:02",
  },
  {
    id: "2",
    date: "2026-10-03",
    subject: "IT313 · Mobile Application Development",
    status: "late" as const,
    time: "10:48",
  },
  {
    id: "3",
    date: "2026-10-01",
    subject: "IT314 · Information Assurance & Security",
    status: "present" as const,
    time: "13:05",
  },
  {
    id: "4",
    date: "2026-09-29",
    subject: "IT312 · Web Systems Integration",
    status: "excused" as const,
    time: "—",
  },
  {
    id: "5",
    date: "2026-09-26",
    subject: "IT313 · Mobile Application Development",
    status: "absent" as const,
    time: "—",
  },
];

export default function StudentHistoryPage() {
  return (
    <div>
      <PageHeader
        title="Attendance history"
        description="Your own attendance record per subject."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <MiniStat label="Present" value="86%" />
        <MiniStat label="Late" value="8%" />
        <MiniStat label="Absent / excused" value="6%" />
      </div>

      <Panel>
        <div className="space-y-3">
          {history.map((h) => (
            <div
              key={h.id}
              className="flex flex-col gap-3 rounded-xl border border-line/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="font-semibold text-ink">{h.subject}</p>
                <p className="mt-1 text-sm text-ink-muted">
                  {h.date}
                  {h.time !== "—" ? ` · scanned ${h.time}` : ""}
                </p>
              </div>
              <AttendanceBadge status={h.status} />
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-line/80 bg-bg-elevated/90 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}
