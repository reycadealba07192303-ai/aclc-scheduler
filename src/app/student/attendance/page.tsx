"use client";

import {
  StudentAttendanceView,
  type StudentAttendanceRecord,
  type StudentAttendanceSession,
} from "@/frontend/components/student/StudentAttendanceView";
import { usePolling } from "@/frontend/hooks/usePolling";
import { useCallback, useEffect, useState } from "react";

type Student = { name: string; studentNumber: string };

/** Open attendance checks: often while the student's QR is showing, slowly otherwise. */
const QR_SHOWING_POLL_MS = 5_000;
const IDLE_POLL_MS = 15_000;
const HISTORY_POLL_MS = 60_000;

export default function StudentAttendancePage() {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessions, setSessions] = useState<StudentAttendanceSession[]>([]);
  const [records, setRecords] = useState<StudentAttendanceRecord[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  const refreshSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/student/attendance-sessions", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load active classes.");
      if (data.student) setStudent(data.student as Student);
      setSessions(data.sessions as StudentAttendanceSession[]);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshRecords = useCallback(async () => {
    try {
      const response = await fetch("/api/student/attendance", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not load attendance history.");
      setRecords(data.records as StudentAttendanceRecord[]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not load attendance history.");
    }
  }, []);

  const qrShowing = sessions.some((session) => session.qr);
  usePolling(refreshSessions, qrShowing ? QR_SHOWING_POLL_MS : IDLE_POLL_MS);
  usePolling(refreshRecords, HISTORY_POLL_MS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSessions();
  }, [refreshSessions]);

  // History changes when the student gets checked in, so reload it then (and on first load).
  const checkedInCount = sessions.filter((session) => session.checkedIn).length;
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshRecords();
  }, [checkedInCount, refreshRecords]);

  // The countdown only needs a clock while a QR is on screen.
  useEffect(() => {
    if (!qrShowing) return;
    const tick = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(tick);
  }, [qrShowing]);

  // Fetch a new QR as soon as the current one expires, rather than waiting for the next poll.
  const nextExpiry = Math.min(...sessions.map((session) => session.qr?.expiresAt ?? Infinity));
  useEffect(() => {
    if (!Number.isFinite(nextExpiry)) return;
    const timeout = window.setTimeout(() => void refreshSessions(), Math.max(0, nextExpiry - Date.now()) + 150);
    return () => window.clearTimeout(timeout);
  }, [nextExpiry, refreshSessions]);

  return <StudentAttendanceView student={student} sessions={sessions} records={records} loading={loading} error={error} now={now} />;
}
