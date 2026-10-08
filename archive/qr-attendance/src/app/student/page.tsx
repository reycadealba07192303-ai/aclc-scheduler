"use client";

import { PageHeader, Panel } from "@/components/ui/Page";
import { ModalityBadge, SessionBadge } from "@/components/ui/StatusBadges";
import { Button } from "@/components/ui/Button";
import {
  DAY_LABELS,
  getRoomName,
  getStudentClassesToday,
  getStudentWeeklySchedule,
  getSubject,
  getTeacherName,
} from "@/data/mock";
import { formatTimeRange } from "@/lib/utils";
import { QrCode } from "lucide-react";
import Link from "next/link";

const hours = ["07:00", "08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];

// Pixels per hour. Blocks and the hour labels/lines must share this value.
const HOUR_PX = 56;
const END_LABEL = "17:00";

function toMinutes(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export default function StudentHomePage() {
  const today = getStudentClassesToday();
  const week = getStudentWeeklySchedule();

  return (
    <div>
      <PageHeader
        title="My schedule"
        description="Read-only weekly calendar of your section (Mon–Sun). QR is only for face-to-face classes with an open session."
      />

      <Panel title="Today" className="mb-6">
        <div className="space-y-3">
          {today.map((c) => (
            <div
              key={c.scheduleId}
              className="flex flex-col gap-3 rounded-xl border border-line/80 p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold">
                    {c.subjectCode} · {c.subjectName}
                  </p>
                  <ModalityBadge modality={c.modality} />
                  <SessionBadge status={c.sessionStatus} />
                </div>
                <p className="mt-1 text-sm text-ink-muted">
                  {formatTimeRange(c.startTime, c.endTime)}
                  {c.roomName ? ` · ${c.roomName}` : " · Online"} · {c.teacherName}
                </p>
              </div>
              {c.modality === "face_to_face" && c.sessionStatus === "open" ? (
                <Link href={`/student/qr?session=${c.sessionId}`}>
                  <Button>
                    <QrCode className="h-4 w-4" />
                    Generate QR
                  </Button>
                </Link>
              ) : (
                <Button variant="secondary" disabled>
                  {c.modality === "online"
                    ? "Online — no QR"
                    : c.sessionStatus === "upcoming"
                      ? "Waiting for session"
                      : "Unavailable"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Weekly schedule · BSIT 3-A · Mon–Sun">
        <div className="overflow-x-auto">
          <div className="min-w-[900px]">
            <div className="mb-2 grid grid-cols-[64px_repeat(7,1fr)] gap-2 text-center text-xs font-semibold uppercase tracking-wide text-ink-muted">
              <div />
              {DAY_LABELS.map((d) => (
                <div key={d.id}>{d.label}</div>
              ))}
            </div>
            <div className="grid grid-cols-[64px_repeat(7,1fr)] gap-2">
              <div
                className="relative text-right text-xs text-ink-muted"
                style={{ height: hours.length * HOUR_PX }}
              >
                {[...hours, END_LABEL].map((h, i) => (
                  <div
                    key={h}
                    className="absolute right-0 -translate-y-1/2"
                    style={{ top: i * HOUR_PX }}
                  >
                    {h}
                  </div>
                ))}
              </div>
              {DAY_LABELS.map((day) => (
                <div
                  key={day.id}
                  className="relative rounded-xl border border-dashed border-line bg-bg/40"
                  style={{
                    height: hours.length * HOUR_PX,
                    backgroundImage: `linear-gradient(to bottom, transparent ${HOUR_PX - 1}px, var(--line) ${HOUR_PX - 1}px)`,
                    backgroundSize: `100% ${HOUR_PX}px`,
                  }}
                >
                  {week
                    .filter((s) => s.dayOfWeek === day.id)
                    .map((s) => {
                      const top = ((toMinutes(s.startTime) - 7 * 60) / 60) * HOUR_PX;
                      const height =
                        ((toMinutes(s.endTime) - toMinutes(s.startTime)) / 60) * HOUR_PX;
                      const subj = getSubject(s.subjectId);
                      const online = s.modality === "online";
                      return (
                        <div
                          key={s.id}
                          className={`absolute inset-x-1 overflow-hidden rounded-lg border p-1.5 ${
                            online
                              ? "border-info/30 bg-info-soft"
                              : "border-accent/30 bg-accent-soft"
                          }`}
                          style={{ top: top + 2, height: Math.max(height - 4, 40) }}
                        >
                          <p
                            className={`text-[11px] font-bold ${
                              online ? "text-info" : "text-accent-strong"
                            }`}
                          >
                            {subj?.code}
                          </p>
                          <p className="truncate text-[10px] text-ink-muted">
                            {getTeacherName(s.teacherId)}
                          </p>
                          <p className="truncate text-[10px] text-ink-muted">
                            {online ? "Online" : getRoomName(s.roomId)}
                          </p>
                        </div>
                      );
                    })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
