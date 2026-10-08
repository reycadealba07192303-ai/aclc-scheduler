"use client";

import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { PageHeader, Panel } from "@/components/ui/Page";
import { AttendanceBadge, SessionBadge } from "@/components/ui/StatusBadges";
import {
  attendanceRecords,
  attendanceSessions,
  getSectionName,
  getSubject,
  students,
} from "@/data/mock";
import { scheduleSlots } from "@/data/mock";
import { useMemo, useState } from "react";

export default function AttendanceMonitorPage() {
  const [scope, setScope] = useState<"session" | "section" | "student">("session");
  const [selectedSession, setSelectedSession] = useState(attendanceSessions[0]?.id);
  const [selectedSection, setSelectedSection] = useState("sec-1");
  const [selectedStudent, setSelectedStudent] = useState(students[0]?.id);

  const sessionRecords = useMemo(() => {
    return attendanceRecords
      .filter((r) => r.sessionId === selectedSession)
      .map((r) => {
        const student = students.find((s) => s.id === r.studentId);
        return { ...r, student };
      });
  }, [selectedSession]);

  return (
    <div>
      <PageHeader
        title="Attendance monitoring"
        description="View attendance records of any class, section, or student."
      />

      <Panel className="mb-6">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="View by">
            <Select
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as "session" | "section" | "student")
              }
            >
              <option value="session">Class session</option>
              <option value="section">Section</option>
              <option value="student">Student</option>
            </Select>
          </Field>

          {scope === "session" && (
            <Field label="Session" className="md:col-span-2">
              <Select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
              >
                {attendanceSessions.map((s) => {
                  const sch = scheduleSlots.find((x) => x.id === s.scheduleId);
                  const subj = sch ? getSubject(sch.subjectId) : null;
                  return (
                    <option key={s.id} value={s.id}>
                      {s.date} · {subj?.code ?? s.id} · {s.status}
                    </option>
                  );
                })}
              </Select>
            </Field>
          )}

          {scope === "section" && (
            <Field label="Section" className="md:col-span-2">
              <Select
                value={selectedSection}
                onChange={(e) => setSelectedSection(e.target.value)}
              >
                <option value="sec-1">BSIT 3-A</option>
                <option value="sec-2">BSIT 3-B</option>
                <option value="sec-3">BSCS 2-A</option>
                <option value="sec-4">BSIS 4-A</option>
              </Select>
            </Field>
          )}

          {scope === "student" && (
            <Field label="Student" className="md:col-span-2">
              <Select
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.studentNumber} — {s.firstName} {s.lastName}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      </Panel>

      {scope === "session" && (
        <Panel
          title="Session roster"
          action={
            <SessionBadge
              status={
                attendanceSessions.find((s) => s.id === selectedSession)?.status ===
                "open"
                  ? "open"
                  : "closed"
              }
            />
          }
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-3 font-semibold">Student</th>
                  <th className="pb-3 font-semibold">Number</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold">Scanned at</th>
                </tr>
              </thead>
              <tbody>
                {sessionRecords.map((r) => (
                  <tr key={r.id} className="border-b border-line/70 last:border-0">
                    <td className="py-3 font-semibold">
                      {r.student
                        ? `${r.student.firstName} ${r.student.lastName}`
                        : "—"}
                    </td>
                    <td className="py-3">{r.student?.studentNumber}</td>
                    <td className="py-3">
                      <AttendanceBadge status={r.status} />
                    </td>
                    <td className="py-3 text-ink-muted">
                      {r.scannedAt
                        ? new Date(r.scannedAt).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {scope === "section" && (
        <Panel title={`Section summary · ${getSectionName(selectedSection)}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Summary tile="Present rate" value="92%" />
            <Summary tile="Late rate" value="5%" />
            <Summary tile="Absent rate" value="3%" />
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Mock section rollup for UI. Wired to live queries in backend phase.
          </p>
        </Panel>
      )}

      {scope === "student" && (
        <Panel title="Student attendance trail">
          <div className="space-y-3">
            {attendanceRecords
              .filter((r) => r.studentId === selectedStudent)
              .map((r) => (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl border border-line/80 p-4"
                >
                  <div>
                    <p className="font-semibold">Session {r.sessionId}</p>
                    <p className="text-sm text-ink-muted">{r.note ?? "No note"}</p>
                  </div>
                  <AttendanceBadge status={r.status} />
                </div>
              ))}
            {attendanceRecords.filter((r) => r.studentId === selectedStudent)
              .length === 0 ? (
              <p className="text-sm text-ink-muted">No records for this student yet.</p>
            ) : null}
          </div>
          <div className="mt-4">
            <Button variant="secondary">Export student CSV</Button>
          </div>
        </Panel>
      )}
    </div>
  );
}

function Summary({ tile, value }: { tile: string; value: string }) {
  return (
    <div className="rounded-xl border border-line bg-bg/50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
        {tile}
      </p>
      <p className="mt-2 font-[family-name:var(--font-display)] text-2xl font-semibold">
        {value}
      </p>
    </div>
  );
}
