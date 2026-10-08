"use client";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PageHeader, Panel } from "@/components/ui/Page";
import { AttendanceBadge } from "@/components/ui/StatusBadges";
import { getStudentClassesToday } from "@/data/mock";
import { CheckCircle2, QrCode, Timer } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Suspense, useEffect, useMemo, useState } from "react";

const ROTATE_SECONDS = 10;

function QrGeneratorInner() {
  const searchParams = useSearchParams();
  const sessionParam = searchParams.get("session");
  const openClass = getStudentClassesToday().find(
    (c) => c.sessionStatus === "open" && c.modality === "face_to_face",
  );
  const sessionId = sessionParam ?? openClass?.sessionId;

  const [secondsLeft, setSecondsLeft] = useState(ROTATE_SECONDS);
  const [nonce, setNonce] = useState(0);
  const [confirmed, setConfirmed] = useState<"present" | "late" | null>(null);

  useEffect(() => {
    if (!sessionId || confirmed) return;
    const tick = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setNonce((n) => n + 1);
          return ROTATE_SECONDS;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [sessionId, confirmed]);

  const payload = useMemo(() => {
    if (!sessionId) return "";
    return JSON.stringify({
      studentId: "s-1",
      studentNumber: "2023-0001",
      sessionId,
      issuedAt: Date.now(),
      nonce,
      exp: Date.now() + ROTATE_SECONDS * 1000,
    });
  }, [sessionId, nonce]);

  if (!sessionId) {
    return (
      <div>
        <PageHeader
          title="Generate QR"
          description="Only for face-to-face classes while your professor has an open session."
        />
        <Panel>
          <div className="flex flex-col items-center py-10 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-line/60 text-ink-muted">
              <QrCode className="h-7 w-7" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              No open face-to-face session
            </h2>
            <p className="mt-2 max-w-md text-sm text-ink-muted">
              QR unlocks only during an open face-to-face class. Online classes do not
              use QR attendance.
            </p>
            <Link href="/student" className="mt-6">
              <Button variant="secondary">Back to my schedule</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div>
        <PageHeader title="Attendance recorded" />
        <Panel>
          <div className="flex flex-col items-center py-12 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-ok-soft text-ok">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-semibold">
              You’re marked {confirmed}
            </h2>
            <p className="mt-2 text-sm text-ink-muted">
              Session {sessionId.toUpperCase()} · Web Systems Integration
            </p>
            <div className="mt-4">
              <AttendanceBadge status={confirmed} />
            </div>
            <Link href="/student/history" className="mt-8">
              <Button variant="secondary">View attendance history</Button>
            </Link>
          </div>
        </Panel>
      </div>
    );
  }

  const progress = (secondsLeft / ROTATE_SECONDS) * 100;

  return (
    <div>
      <PageHeader
        title="Generate QR"
        description="A new code every 10 seconds. Expired or already-used codes are rejected."
        actions={
          <Badge tone="ok" className="live-pulse">
            Session open
          </Badge>
        }
      />

      <div className="mx-auto grid max-w-3xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <Panel>
          <div className="flex flex-col items-center">
            <div className="rounded-3xl border border-line bg-white p-5 shadow-[0_20px_50px_rgba(15,118,110,0.12)]">
              <QRCodeSVG value={payload} size={220} level="M" includeMargin />
            </div>
            <div className="mt-6 flex w-full max-w-xs items-center gap-3">
              <Timer className="h-4 w-4 text-accent" />
              <div className="flex-1">
                <div className="mb-1 flex justify-between text-xs font-semibold text-ink-muted">
                  <span>Refreshes in</span>
                  <span>{secondsLeft}s</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-line">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-1000 linear"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-4 text-center text-xs text-ink-muted">
              Show this to your teacher. Do not screenshot — codes expire quickly and
              are single-use.
            </p>
          </div>
        </Panel>

        <Panel title="Session details">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Subject
              </dt>
              <dd className="mt-1 font-semibold">IT312 · Web Systems Integration</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Room
              </dt>
              <dd className="mt-1">Lab 101</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Student
              </dt>
              <dd className="mt-1">Reyca Lopez · 2023-0001</dd>
            </div>
          </dl>

          <div className="mt-8 rounded-xl border border-dashed border-line bg-bg/50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              UI demo
            </p>
            <p className="mt-1 text-sm text-ink-muted">
              Simulate a successful teacher scan:
            </p>
            <div className="mt-3 flex gap-2">
              <Button onClick={() => setConfirmed("present")}>Mark present</Button>
              <Button variant="secondary" onClick={() => setConfirmed("late")}>
                Mark late
              </Button>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

export default function StudentQrPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-sm text-ink-muted">
          Loading QR…
        </div>
      }
    >
      <QrGeneratorInner />
    </Suspense>
  );
}
