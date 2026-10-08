"use client";

import { Button } from "@/frontend/components/ui/Button";
import { Field, Select } from "@/frontend/components/ui/Field";
import { Badge } from "@/frontend/components/ui/Badge";
import { PageHeader, Panel, Tabs } from "@/frontend/components/ui/Page";
import { ScheduleGrid } from "@/frontend/components/schedule/ScheduleGrid";
import { DAY_LABELS, END_OPTIONS, START_OPTIONS, formatTime, toMinutes } from "@/shared/lib/time";
import { ModalityBadge } from "@/frontend/components/ui/StatusBadges";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import type { ClassModality, ScheduleSlot } from "@/shared/types";
import { AlertTriangle, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";

function SchedulePageInner() {
  const searchParams = useSearchParams();
  const roomFromUrl = searchParams.get("room");
  const {
    scheduleSlots: slots,
    sections,
    programs,
    subjects,
    activeTerm,
    rooms,
    getRoomName,
    addScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    teachers,
  } = useAcademicStore();

  const [filterRoom, setFilterRoom] = useState(roomFromUrl ?? "all");
  const [filterTeacher, setFilterTeacher] = useState("all");
  const [filterSection, setFilterSection] = useState("all");
  const [view, setView] = useState<"week" | "classroom">(
    roomFromUrl ? "classroom" : "week",
  );
  const [classroomPick, setClassroomRoom] = useState(roomFromUrl ?? "");
  const classroomRoom =
    rooms.find((r) => r.id === classroomPick)?.id ?? rooms[0]?.id ?? "";
  // Everything a class needs. Rooms are optional (online classes have none).
  const missing = [
    sections.length === 0 && "sections",
    subjects.length === 0 && "subjects",
    !teachers.some((t) => t.status === "active") && "professors",
  ].filter((m): m is string => Boolean(m));

  const [showForm, setShowForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [modality, setModality] = useState<ClassModality>("face_to_face");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [formSectionId, setFormSectionId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("");
  const selectedFormSection = sections.find((section) => section.id === formSectionId) ?? sections[0];
  const selectedFormProgram = programs.find((program) => program.code === selectedFormSection?.program);
  const programCurriculum = selectedFormProgram?.curriculum ?? [];
  const mappedSubjectCodes = programCurriculum
    .filter((course) => course.yearLevel === selectedFormSection?.yearLevel && (activeTerm?.semester === "Summer" || course.semester === activeTerm?.semester))
    .map((course) => course.code.toUpperCase());
  const formSubjects = selectedFormProgram
    ? programCurriculum.length
      ? subjects.filter((subject) => subject.track === selectedFormProgram.track && mappedSubjectCodes.includes(subject.code.toUpperCase()))
      : subjects.filter((subject) => subject.track === selectedFormProgram.track)
    : [];
  const selectedFormSubjectId = formSubjects.some((subject) => subject.id === formSubjectId)
    ? formSubjectId
    : formSubjects[0]?.id ?? "";

  function openAddForm(day = 1, startTime = "08:00") {
    setEditingSlot(null);
    setFormSectionId(sections[0]?.id ?? "");
    setFormSubjectId("");
    setModality("face_to_face");
    setConflicts([]);
    setFormDefaults({ day, startTime, endTime: "10:00" });
    setShowForm(true);
  }

  function openEditForm(slot: ScheduleSlot) {
    setEditingSlot(slot);
    setFormSectionId(slot.sectionId);
    setFormSubjectId(slot.subjectId);
    setModality(slot.modality);
    setConflicts([]);
    setFormDefaults({ day: slot.dayOfWeek, startTime: slot.startTime, endTime: slot.endTime });
    setShowForm(true);
  }

  const filtered = useMemo(() => {
    return slots.filter((s) => {
      if (filterRoom !== "all") {
        if (s.modality !== "face_to_face" || s.roomId !== filterRoom) return false;
      }
      if (filterTeacher !== "all" && s.teacherId !== filterTeacher) return false;
      if (filterSection !== "all" && s.sectionId !== filterSection) return false;
      return true;
    });
  }, [slots, filterRoom, filterTeacher, filterSection]);

  const classroomSlots = useMemo(() => {
    return slots.filter(
      (s) => s.modality === "face_to_face" && s.roomId === classroomRoom,
    );
  }, [slots, classroomRoom]);

  const [formDefaults, setFormDefaults] = useState({ day: 1, startTime: "08:00", endTime: "10:00" });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const draft = {
      dayOfWeek: Number(fd.get("dayOfWeek")),
      startTime: String(fd.get("startTime")),
      endTime: String(fd.get("endTime")),
      teacherId: String(fd.get("teacherId")),
      subjectId: String(fd.get("subjectId")),
      sectionId: String(fd.get("sectionId")),
      modality,
      roomId: modality === "face_to_face" ? String(fd.get("roomId")) : undefined,
    };

    if (modality === "face_to_face" && !draft.roomId) {
      setConflicts(["Face-to-face classes require a classroom."]);
      return;
    }

    if (toMinutes(draft.endTime) <= toMinutes(draft.startTime)) {
      setConflicts(["End time must be after the start time."]);
      return;
    }

    try {
    const result = editingSlot
      ? await updateScheduleSlot(editingSlot.id, draft)
      : await addScheduleSlot(draft);
    if (!result.ok) {
      setConflicts(result.conflicts);
      return;
    }

    setShowForm(false);
    setEditingSlot(null);
    setConflicts([]);
    } catch (error) {
      setConflicts([error instanceof Error ? error.message : "Could not save the schedule slot."]);
    }
  }

  const renderGrid = (items: typeof slots) => <ScheduleGrid items={items} onSlotClick={openEditForm} />;

  return (
    <div>
      <PageHeader
        title="Schedule"
        description="Weekly class schedule, Monday to Sunday. Face-to-face classes need a room; online classes don’t."
        actions={
          <Button
            onClick={() => openAddForm()}
            disabled={missing.length > 0}
            title={missing.length > 0 ? `Add ${missing.join(", ")} first` : undefined}
          >
            <Plus className="h-4 w-4" />
            Add class
          </Button>
        }
      />

      {missing.length > 0 ? (
        <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-warn">
          <span className="font-semibold">Before scheduling classes, add:</span>
          {missing.map((m) => (
            <Link
              key={m}
              href={m === "professors" ? "/admin/users" : m === "sections" ? "/admin/programs" : "/admin/setup"}
              className="font-medium underline underline-offset-2"
            >
              {m}
            </Link>
          ))}
        </div>
      ) : null}

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { id: "week", label: "Weekly calendar" },
          { id: "classroom", label: "By classroom" },
        ]}
      />

      {view === "week" ? (
        <>
          <Panel className="mb-6">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label="Room (face-to-face only)">
                <Select
                  value={filterRoom}
                  onChange={(e) => setFilterRoom(e.target.value)}
                >
                  <option value="all">All rooms</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Professor">
                <Select
                  value={filterTeacher}
                  onChange={(e) => setFilterTeacher(e.target.value)}
                >
                  <option value="all">All professors</option>
                  {teachers
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select
                  value={filterSection}
                  onChange={(e) => setFilterSection(e.target.value)}
                >
                  <option value="all">All sections</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel title="Weekly grid · Mon–Sun">
            {renderGrid(filtered)}
          </Panel>
        </>
      ) : (
        <>
          <Panel className="mb-6">
            <Field label="Classroom">
              <Select
                value={classroomRoom}
                onChange={(e) => setClassroomRoom(e.target.value)}
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.building})
                  </option>
                ))}
              </Select>
            </Field>
            <p className="mt-3 text-sm text-ink-muted">
              Only face-to-face classes assigned to{" "}
              <strong>{getRoomName(classroomRoom)}</strong> appear here.
            </p>
          </Panel>
          <Panel
            title={`Classroom · ${getRoomName(classroomRoom)}`}
            action={<Badge tone="accent">FTF only</Badge>}
          >
            {classroomSlots.length === 0 ? (
              <p className="text-sm text-ink-muted">
                No face-to-face classes booked in this room yet.
              </p>
            ) : (
              renderGrid(classroomSlots)
            )}
          </Panel>
        </>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge tone="accent">
          {(() => {
            const n = view === "week" ? filtered.length : classroomSlots.length;
            return `${n} class${n === 1 ? "" : "es"} shown`;
          })()}
        </Badge>
        <Badge tone="neutral">Conflicts: room (FTF) · professor · section</Badge>
        <ModalityBadge modality="face_to_face" />
        <ModalityBadge modality="online" />
      </div>

      {showForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            key={editingSlot?.id ?? "new-schedule"}
            onSubmit={handleSubmit}
            className="w-full max-w-lg rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {editingSlot ? "Edit schedule slot" : "Add schedule slot"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Day">
                <Select name="dayOfWeek" defaultValue={String(formDefaults.day)}>
                  {DAY_LABELS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject">
                <Select name="subjectId" value={selectedFormSubjectId} onChange={(event) => setFormSubjectId(event.target.value)} required disabled={!formSubjects.length}>
                  {formSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} — {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start">
                <Select name="startTime" defaultValue={formDefaults.startTime}>
                  {START_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {formatTime(h)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="End">
                <Select name="endTime" defaultValue={formDefaults.endTime}>
                  {END_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {formatTime(h)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Professor">
                <Select name="teacherId" defaultValue={editingSlot?.teacherId ?? teachers.find((t) => t.status === "active")?.id}>
                  {teachers
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                </Select>
              </Field>
              <Field label="Section">
                <Select name="sectionId" value={selectedFormSection?.id ?? ""} onChange={(event) => { setFormSectionId(event.target.value); setFormSubjectId(""); }} required>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </Select>
              </Field>
              {!formSubjects.length ? <p className="sm:col-span-2 text-xs text-warn">No curriculum subjects found for this section&apos;s level and {activeTerm?.semester ?? "current semester"}.</p> : programCurriculum.length === 0 ? <p className="sm:col-span-2 text-xs text-ink-muted">This program has no curriculum map yet; showing all subjects for its track.</p> : null}
              <Field label="Modality" className="sm:col-span-2">
                <Select
                  value={modality}
                  onChange={(e) => {
                    const nextModality = e.target.value as ClassModality;
                    setModality(nextModality);
                    if (nextModality === "online") {
                      setConflicts((current) => current.filter((conflict) => !conflict.startsWith("Room already booked") && conflict !== "Face-to-face classes require a classroom."));
                    }
                  }}
                >
                  <option value="face_to_face">Face-to-face</option>
                  <option value="online">Online</option>
                </Select>
              </Field>
              {modality === "face_to_face" ? (
                <Field label="Classroom" className="sm:col-span-2">
                  <Select name="roomId" defaultValue={editingSlot?.roomId ?? rooms[0]?.id} required>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.building})
                      </option>
                    ))}
                  </Select>
                </Field>
              ) : (
                <p className="sm:col-span-2 text-xs text-ink-muted">
                  Online classes have no room.
                </p>
              )}
            </div>

            {conflicts.length > 0 ? (
              <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
                  <AlertTriangle className="h-4 w-4" />
                  Conflict detected — slot blocked
                </div>
                <ul className="space-y-1 text-sm text-danger">
                  {conflicts.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-4 text-xs text-ink-muted">
                Tip: book Lab 101 on Mon 08:00–10:00 (FTF) to see room conflict.
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowForm(false);
                  setEditingSlot(null);
                  setConflicts([]);
                }}
              >
                Cancel
              </Button>
              {editingSlot ? <Button type="button" variant="danger" onClick={async () => {
                if (!window.confirm("Delete this schedule slot?")) return;
                try {
                  await deleteScheduleSlot(editingSlot.id);
                  setShowForm(false);
                  setEditingSlot(null);
                  setConflicts([]);
                } catch (error) {
                  setConflicts([error instanceof Error ? error.message : "Could not delete the schedule slot."]);
                }
              }}>Delete</Button> : null}
              <Button type="submit" disabled={!formSubjects.length}>{editingSlot ? "Save changes" : "Save slot"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}

export default function SchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-sm text-ink-muted">
          Loading schedule…
        </div>
      }
    >
      <SchedulePageInner />
    </Suspense>
  );
}
