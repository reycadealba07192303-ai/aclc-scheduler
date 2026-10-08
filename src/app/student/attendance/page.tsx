"use client";

import {
  StudentAttendanceView,
  type StudentAttendanceRecord,
  type StudentAttendanceSession,
} from "@/frontend/components/student/StudentAttendanceView";
import { useCallback, useEffect, useState } from "react";

type Student = { name: string; studentNumber: string };

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<StudentAttendanceSession[]>([]);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const [sessionsResponse, recordsResponse] = await Promise.all([
      fetch("/api/student/attendance-sessions", { cache: "no-store" }),
      fetch("/api/student/attendance", { cache: "no-store" }),
    ]);
    const [sessionsData, recordsData] = await Promise.all([sessionsResponse.json(), recordsResponse.json()]);
    if (!sessionsResponse.ok) throw new Error(sessionsData.error ?? "Could not load active classes.");
    if (!recordsResponse.ok) throw new Error(recordsData.error ?? "Could not load attendance history.");
    if (sessionsData.student) setStudent(sessionsData.student as Student);
    setSessions(sessionsData.sessions as StudentAttendanceSession[]);
    setRecords(recordsData.records as StudentAttendanceRecord[]);
  }, []);

  const refresh = useCallback(async () => {
    try {
      await load();
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    // Initial load plus a steady poll so new sessions and check-ins appear on their own.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh();
    const poll = window.setInterval(() => void refresh(), 2500);
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => {
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [refresh]);

  // Fetch a new QR as soon as the current one expires, rather than waiting for the next poll.
  const nextExpiry = Math.min(...sessions.map((session) => session.qr?.expiresAt ?? Infinity));
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = window.setTimeout(() => void refresh(), Math.max(0, nextExpiry - Date.now()) + 150);
    return () => window.clearTimeout(timeout);
  }, [nextExpiry, refresh]);

  return <StudentAttendanceView student={student} sessions={sessions} records={records} loading={loading} error={error} now={now} />;
}
