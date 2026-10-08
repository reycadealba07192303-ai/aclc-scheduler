"use client";

import { Badge } from "@/frontend/components/ui/Badge";
import { Field, Select } from "@/frontend/components/ui/Field";
import { PageHeader, Panel } from "@/frontend/components/ui/Page";
import { ScheduleGrid } from "@/frontend/components/schedule/ScheduleGrid";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { Building2 } from "lucide-react";
import { useState } from "react";

export default function TeacherClassroomsPage() {
  const { rooms, roomBookings } = useAcademicStore();
  const [pick, setPick] = useState("");
  const room = rooms.find((r) => r.id === pick) ?? rooms[0];

  const booked = roomBookings.filter((booking) => booking.roomId === room?.id);

  return (
    <div>
      <PageHeader
        title="Classrooms"
        description="See when each classroom is booked. Only face-to-face classes appear here."
      />

      {!room ? (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-line bg-bg-elevated/60 px-6 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent">
            <Building2 className="h-7 w-7" />
          </div>
          <h2 className="mt-5 font-[family-name:var(--font-display)] text-xl font-semibold text-ink">
            No classrooms yet
          </h2>
          <p className="mt-1 max-w-sm text-sm text-ink-muted">
            The admin has not added any rooms.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <Panel>
            <Field label="Classroom" className="max-w-sm">
              <Select value={room.id} onChange={(e) => setPick(e.target.value)}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.building})
                  </option>
                ))}
              </Select>
            </Field>
          </Panel>

          <Panel
            title={`${room.name} · ${room.building}`}
            action={<Badge tone="accent">Capacity {room.capacity}</Badge>}
          >
            {booked.length === 0 ? (
              <p className="text-sm text-ink-muted">No classes booked in this room yet.</p>
            ) : (
              <ScheduleGrid items={booked} showTeacher={false} busyOnly />
            )}
          </Panel>
        </div>
      )}
    </div>
  );
}
