"use client";

import { Button } from "@/frontend/components/ui/Button";
import { Field, Select } from "@/frontend/components/ui/Field";
import { Badge } from "@/frontend/components/ui/Badge";
import { PageHeader, Panel, Tabs } from "@/frontend/components/ui/Page";
import { ModalityBadge } from "@/frontend/components/ui/StatusBadges";
import { ScheduleGrid } from "@/frontend/components/schedule/ScheduleGrid";
import { ImportSectionStudentsModal, type StudentImportRow } from "@/frontend/components/admin/ImportSectionStudentsModal";
import { useAcademicStore } from "@/frontend/context/AcademicStore";
import { downloadSectionSchedulePdf } from "@/frontend/lib/section-schedule-pdf";
import { DAY_LABELS, END_OPTIONS, START_OPTIONS, formatRange, formatTime, toHHMM, toMinutes } from "@/shared/lib/time";
import type { ClassModality, ScheduleSlot } from "@/shared/types";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Download,
  FileUp,
  LoaderCircle,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type SectionStudent = { id: string; studentId: string; name: string; email: string };
type SectionTab = "schedule" | "students";

async function fetchSectionStudents(sectionId: string): Promise<SectionStudent[]> {
  const response = await fetch(`/api/admin/sections/${encodeURIComponent(sectionId)}/students`);
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? "Could not load students.");
  return result.students as SectionStudent[];
}

export default function SectionDetailPage() {
  const params = useParams<{ id: string }>();
  const sectionId = params.id;

  const {
    programs,
    sections,
    getSectionTrack,
    activeTerm,
    scheduleSlots,
    sectionAssignments,
    subjects,
    rooms,
    getSubject,
    getRoomName,
    addScheduleSlot,
    updateScheduleSlot,
    deleteScheduleSlot,
    upsertAssignment,
    teachers,
    getTeacherName,
  } = useAcademicStore();

  const section = sections.find((s) => s.id === sectionId);
  const path = section
    ? [section.program, section.yearLevel, section.name].join(" · ")
    : "";

  const [showScheduleForm, setShowScheduleForm] = useState(false);
  const [editingSlot, setEditingSlot] = useState<ScheduleSlot | null>(null);
  const [modality, setModality] = useState<ClassModality>("face_to_face");
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [savedNote, setSavedNote] = useState<string | null>(null);
  const [formDay, setFormDay] = useState(1);
  const [formStart, setFormStart] = useState("08:00");
  const [formEnd, setFormEnd] = useState("09:00");
  const [formSubjectId, setFormSubjectId] = useState("");
  const [sectionStudents, setSectionStudents] = useState<SectionStudent[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [studentsError, setStudentsError] = useState("");
  const [importStudentsOpen, setImportStudentsOpen] = useState(false);
  const [sectionTab, setSectionTab] = useState<SectionTab>("schedule");
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  // Reset the roster state when moving to another section (during render, per React's guidance).
  const [rosterSectionId, setRosterSectionId] = useState(sectionId);
  if (rosterSectionId !== sectionId) {
    setRosterSectionId(sectionId);
    setSectionStudents([]);
    setStudentsLoading(true);
    setStudentsError("");
  }

  useEffect(() => {
    let active = true;
    fetchSectionStudents(sectionId)
      .then((students) => { if (active) setSectionStudents(students); })
      .catch((error: unknown) => { if (active) setStudentsError(error instanceof Error ? error.message : "Could not load students."); })
      .finally(() => { if (active) setStudentsLoading(false); });
    return () => { active = false; };
  }, [sectionId]);

  async function handleStudentImport(students: StudentImportRow[]) {
    const response = await fetch(`/api/admin/sections/${encodeURIComponent(sectionId)}/students`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ students }),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error ?? "Could not import students.");
    setSectionStudents(await fetchSectionStudents(sectionId));
    setImportStudentsOpen(false);
    const added = Number(result.added ?? 0);
    const alreadyInSection = Number(result.alreadyInSection ?? 0);
    setSavedNote(`${added} student${added === 1 ? "" : "s"} imported${alreadyInSection ? `; ${alreadyInSection} already in this section` : ""}.`);
    setTimeout(() => setSavedNote(null), 5000);
  }

  const slots = useMemo(
    () => scheduleSlots.filter((s) => s.sectionId === sectionId),
    [scheduleSlots, sectionId],
  );

  const assignments = useMemo(
    () => sectionAssignments.filter((a) => a.sectionId === sectionId),
    [sectionAssignments, sectionId],
  );

  const sectionProgram = programs.find((program) => program.code === section?.program);
  const sectionCurriculum = sectionProgram?.curriculum ?? [];
  const sectionCurriculumCodes = sectionCurriculum
    .filter((course) => course.yearLevel === section?.yearLevel && (activeTerm?.semester === "Summer" || course.semester === activeTerm?.semester))
    .map((course) => course.code.toUpperCase());
  const sectionTrack = section ? getSectionTrack(section) : "college";
  const trackSubjects = sectionCurriculum.length
    ? subjects.filter((subject) => subject.track === sectionTrack && sectionCurriculumCodes.includes(subject.code.toUpperCase()))
    : subjects.filter((subject) => subject.track === sectionTrack);
  const selectedSectionSubjectId = trackSubjects.some((subject) => subject.id === formSubjectId)
    ? formSubjectId
    : trackSubjects[0]?.id ?? "";

  function openAddSchedule(day = 1, startTime = "08:00", endTime = "09:00") {
    setEditingSlot(null);
    setFormDay(day);
    setFormStart(startTime);
    setFormEnd(endTime);
    setFormSubjectId("");
    setModality("face_to_face");
    setConflicts([]);
    setShowScheduleForm(true);
  }

  function openEditSchedule(slot: ScheduleSlot) {
    setEditingSlot(slot);
    setFormDay(slot.dayOfWeek);
    setFormStart(slot.startTime);
    setFormEnd(slot.endTime);
    setFormSubjectId(slot.subjectId);
    setModality(slot.modality);
    setConflicts([]);
    setShowScheduleForm(true);
  }

  async function handleDeleteSchedule(slot: ScheduleSlot) {
    if (!window.confirm("Delete this schedule slot?")) return;
    try {
      await deleteScheduleSlot(slot.id);
      setShowScheduleForm(false);
      setEditingSlot(null);
      setConflicts([]);
      setSavedNote("Schedule slot deleted.");
      setTimeout(() => setSavedNote(null), 4000);
    } catch (error) {
      setConflicts([error instanceof Error ? error.message : "Could not delete the schedule slot."]);
    }
  }

  async function handleAddSchedule(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const teacherId = String(fd.get("teacherId"));
    const subjectId = String(fd.get("subjectId"));
    const draft = {
      sectionId,
      dayOfWeek: Number(fd.get("dayOfWeek")),
      startTime: String(fd.get("startTime")),
      endTime: String(fd.get("endTime")),
      teacherId,
      subjectId,
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
      upsertAssignment(sectionId, subjectId, teacherId);
      setShowScheduleForm(false);
      setEditingSlot(null);
      setConflicts([]);
      setSavedNote(editingSlot ? "Schedule changes saved." : "Schedule saved and added to the calendar.");
      setTimeout(() => setSavedNote(null), 4000);
    } catch (error) {
      setConflicts([error instanceof Error ? error.message : "Could not save the schedule slot."]);
    }
  }

  async function handleDownloadSchedule() {
    if (!section) return;
    setDownloading(true);
    setDownloadError("");
    try {
      // Monday first, Sunday last.
      const dayOrder = (day: number) => (day === 0 ? 7 : day);
      const ordered = [...slots].sort((a, b) => dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) || a.startTime.localeCompare(b.startTime));
      const dayName = (day: number) => DAY_LABELS.find((item) => item.id === day)?.long ?? "";
      const timeRange = (slot: ScheduleSlot) => `${formatTime(slot.startTime)} - ${formatTime(slot.endTime)}`;
      const subjectLabel = (id: string) => {
        const subject = getSubject(id);
        return subject ? `${subject.code} - ${subject.name}` : "Subject unavailable";
      };
      // Curriculum subjects for this level, plus any scheduled subject outside it.
      const subjectIds = [...new Set([...trackSubjects.map((subject) => subject.id), ...ordered.map((slot) => slot.subjectId)])];
      const professors = subjectIds.map((subjectId) => {
        const subjectSlots = ordered.filter((slot) => slot.subjectId === subjectId);
        const teacherIds = [...new Set([
          ...subjectSlots.map((slot) => slot.teacherId),
          ...assignments.filter((item) => item.subjectId === subjectId).map((item) => item.teacherId),
        ])];
        const assigned = teachers.filter((teacher) => teacherIds.includes(teacher.id));
        return {
          subject: subjectLabel(subjectId),
          professor: assigned.length ? assigned.map((teacher) => `${teacher.firstName} ${teacher.lastName}`).join(", ") : "To be assigned",
          classes: subjectSlots.length ? subjectSlots.map((slot) => `${DAY_LABELS.find((item) => item.id === slot.dayOfWeek)?.label ?? ""} ${timeRange(slot)}`).join("\n") : "Not scheduled",
        };
      });
      await downloadSectionSchedulePdf({
        sectionName: section.name,
        subtitle: `${section.program} | ${section.yearLevel}`,
        term: activeTerm ? `A.Y. ${activeTerm.startYear}-${activeTerm.startYear + 1} | ${activeTerm.semester}` : "",
        schedule: ordered.map((slot) => ({
          day: dayName(slot.dayOfWeek),
          time: timeRange(slot),
          subject: subjectLabel(slot.subjectId),
          units: String(getSubject(slot.subjectId)?.units ?? ""),
          professor: getTeacherName(slot.teacherId),
          classType: slot.modality === "online" ? "Online" : "Face-to-face",
          room: slot.modality === "online" ? "Online" : getRoomName(slot.roomId) ?? "Room unavailable",
        })),
        professors,
        fileName: `schedule-${`${section.program}-${section.name}`.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase()}.pdf`,
      });
    } catch (error) {
      console.error("Section schedule PDF export failed:", error);
      setDownloadError("Could not create the schedule PDF. Please try again.");
    } finally {
      setDownloading(false);
    }
  }

  if (!section) {
    return (
      <div className="rounded-2xl border border-line bg-bg-elevated p-8 text-center">
        <p className="font-semibold">Section not found</p>
        <Link href="/admin/programs" className="mt-4 inline-block text-sm font-semibold text-accent">
          Back to programs
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link
        href={`/admin/programs/${programs.find((p) => p.code === section.program)?.id ?? ""}`}
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-ink-muted hover:text-accent"
      >
        <ArrowLeft className="h-4 w-4" />
        {section.program}
      </Link>

      {savedNote ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-ok/30 bg-ok-soft px-4 py-3 text-sm font-medium text-ok">
          <CheckCircle2 className="h-4 w-4" />
          {savedNote}
          <Link href="/admin/schedule" className="ml-auto font-semibold underline">
            Open calendar
          </Link>
        </div>
      ) : null}

      <PageHeader
        title={section.name}
        description={path}
        actions={sectionTab === "schedule" ? (
          <>
            <Button variant="secondary" onClick={() => void handleDownloadSchedule()} disabled={downloading}>
              {downloading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {downloading ? "Creating PDF..." : "Download schedule"}
            </Button>
            <Link href="/admin/schedule">
              <Button variant="secondary">
                <CalendarDays className="h-4 w-4" />
                View calendar
              </Button>
            </Link>
            <Button
              onClick={() => openAddSchedule()}
              disabled={trackSubjects.length === 0 || !teachers.some((t) => t.status === "active")}
              title={
                trackSubjects.length === 0 || !teachers.some((t) => t.status === "active")
                  ? "Add curriculum subjects for this level and an active professor first"
                  : undefined
              }
            >
              <Plus className="h-4 w-4" />
              Add class
            </Button>
          </>
        ) : undefined}
      />

      {downloadError ? <p role="alert" className="mb-4 rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger">{downloadError}</p> : null}

      <Tabs
        tabs={[
          { id: "schedule" as const, label: "Schedule" },
          { id: "students" as const, label: "Students", count: sectionStudents.length },
        ]}
        value={sectionTab}
        onChange={(tab) => {
          setSectionTab(tab);
          if (tab === "students") {
            setShowScheduleForm(false);
            setEditingSlot(null);
            setConflicts([]);
          }
        }}
      />

      <div hidden={sectionTab !== "students"}>
      <Panel className="mb-5" title={`Students · ${sectionStudents.length}`} action={<Button type="button" variant="secondary" onClick={() => setImportStudentsOpen(true)}><FileUp className="h-4 w-4" />Import Excel</Button>}>
        {studentsLoading ? <p className="py-6 text-center text-sm text-ink-muted">Loading students...</p> : studentsError ? <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-danger/25 bg-danger-soft px-3 py-3 text-sm text-danger"><span>{studentsError}</span><Button type="button" variant="secondary" onClick={() => { setStudentsLoading(true); fetchSectionStudents(sectionId).then(setSectionStudents).catch((error: unknown) => setStudentsError(error instanceof Error ? error.message : "Could not load students.")).finally(() => setStudentsLoading(false)); }}>Retry</Button></div> : sectionStudents.length ? <div className="max-h-[420px] overflow-auto rounded-lg border border-line"><table className="w-full text-left text-sm"><thead className="sticky top-0 bg-bg text-xs uppercase tracking-wide text-ink-muted"><tr><th className="px-4 py-3">Student ID</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">School email</th></tr></thead><tbody className="divide-y divide-line/70">{sectionStudents.map((student) => <tr key={student.id}><td className="px-4 py-3 font-semibold text-accent">{student.studentId}</td><td className="px-4 py-3">{student.name}</td><td className="px-4 py-3 text-ink-muted">{student.email || "Add email by re-importing the roster"}</td></tr>)}</tbody></table></div> : <div className="rounded-lg border border-dashed border-line bg-bg/40 px-4 py-8 text-center"><p className="text-sm font-semibold text-ink">No students in this section yet</p><p className="mt-1 text-sm text-ink-muted">Import an Excel file with student_id, NAME, and EMAIL columns.</p></div>}
      </Panel>
      </div>

      <div hidden={sectionTab !== "schedule"}>
      <div className="mb-6">
        <Panel title="Assigned professors (by subject)">
          <p className="mb-3 text-xs text-ink-muted">
            Professors are also set when you add a schedule slot below.
          </p>
          <div className="space-y-3">
            {trackSubjects.length ? trackSubjects.map((sub) => {
              const assigned = assignments.find((a) => a.subjectId === sub.id);
              return (
                <div key={sub.id} className="rounded-xl border border-line/80 p-3">
                  <p className="text-sm font-semibold">
                    {sub.code} · {sub.name}
                  </p>
                  <div className="mt-2">
                    <Select
                      value={assigned?.teacherId ?? ""}
                      onChange={(e) => {
                        if (e.target.value) {
                          upsertAssignment(sectionId, sub.id, e.target.value);
                        }
                      }}
                    >
                      <option value="">Select professor…</option>
                      {teachers
                        .filter((t) => t.status === "active")
                        .map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.firstName} {t.lastName}
                          </option>
                        ))}
                    </Select>
                  </div>
                </div>
              );
            }) : <p className="py-5 text-center text-sm text-ink-muted">No subjects are mapped to this section&apos;s level and {activeTerm?.semester ?? "current semester"} yet.</p>}
          </div>
        </Panel>
      </div>

      <Panel className="mb-5" title="Weekly schedule · Mon–Sun" action={<Badge tone="accent">{slots.length} classes</Badge>}>
        <p className="mb-4 text-xs text-ink-muted">Select an empty half-hour slot to add a class. The section is already selected.</p>
        <ScheduleGrid items={slots} onSlotClick={openEditSchedule} onEmptySlot={(day, start) => {
          openAddSchedule(day, start, toHHMM(Math.min(toMinutes(start) + 60, 21 * 60)));
        }} />
      </Panel>

      <Panel
        title="Class list"
        action={<Badge tone="accent">Live on calendar</Badge>}
      >
        {slots.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-bg/50 px-4 py-10 text-center">
            <p className="text-sm text-ink-muted">
              No classes yet. Add a schedule slot with a professor — it will appear
              on the weekly calendar and classroom schedule right away.
            </p>
            <Button className="mt-4" onClick={() => openAddSchedule()}>
              <Plus className="h-4 w-4" />
              Add first class
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs uppercase tracking-wide text-ink-muted">
                  <th className="pb-3 font-semibold">Day</th>
                  <th className="pb-3 font-semibold">Time</th>
                  <th className="pb-3 font-semibold">Subject</th>
                  <th className="pb-3 font-semibold">Professor</th>
                  <th className="pb-3 font-semibold">Modality</th>
                  <th className="pb-3 font-semibold">Room</th>
                  <th className="pb-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {slots
                  .slice()
                  .sort((a, b) => {
                    const dayOrder = (d: number) => (d === 0 ? 7 : d);
                    return (
                      dayOrder(a.dayOfWeek) - dayOrder(b.dayOfWeek) ||
                      toMinutes(a.startTime) - toMinutes(b.startTime)
                    );
                  })
                  .map((s) => (
                    <tr key={s.id} className="border-b border-line/70 last:border-0">
                      <td className="py-3 font-semibold">
                        {DAY_LABELS.find((d) => d.id === s.dayOfWeek)?.label}
                      </td>
                      <td className="py-3">
                        {formatRange(s.startTime, s.endTime)}
                      </td>
                      <td className="py-3">{getSubject(s.subjectId)?.code}</td>
                      <td className="py-3">{getTeacherName(s.teacherId)}</td>
                      <td className="py-3">
                        <ModalityBadge modality={s.modality} />
                      </td>
                      <td className="py-3">
                        {s.modality === "face_to_face"
                          ? getRoomName(s.roomId) ?? "—"
                          : "—"}
                      </td>
                      <td className="py-2">
                        <div className="flex justify-end gap-1">
                          <Button type="button" variant="ghost" className="h-8 w-8 px-0" aria-label="Edit schedule slot" title="Edit schedule slot" onClick={() => openEditSchedule(s)}><Pencil className="h-4 w-4" /></Button>
                          <Button type="button" variant="danger-ghost" className="h-8 w-8 px-0" aria-label="Delete schedule slot" title="Delete schedule slot" onClick={() => void handleDeleteSchedule(s)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {showScheduleForm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <form
            key={editingSlot?.id ?? "new-section-schedule"}
            onSubmit={handleAddSchedule}
            className="w-full max-w-lg rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold">
              {editingSlot ? "Edit schedule slot" : "Add schedule + assign professor"}
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Saves to this section and syncs to the Schedule calendar.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Day">
                <Select name="dayOfWeek" value={formDay} onChange={(e) => setFormDay(Number(e.target.value))}>
                  {DAY_LABELS.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Subject">
                <Select
                  name="subjectId"
                  value={selectedSectionSubjectId}
                  onChange={(event) => setFormSubjectId(event.target.value)}
                  required
                  disabled={!trackSubjects.length}
                >
                  {trackSubjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Start">
                <Select name="startTime" value={formStart} onChange={(e) => {
                  const start = e.target.value;
                  setFormStart(start);
                  setFormEnd(toHHMM(Math.min(toMinutes(start) + 60, 21 * 60)));
                }}>
                  {START_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {formatTime(h)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="End">
                <Select name="endTime" value={formEnd} onChange={(e) => setFormEnd(e.target.value)}>
                  {END_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {formatTime(h)}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Professor" className="sm:col-span-2">
                <Select name="teacherId" defaultValue={editingSlot?.teacherId ?? teachers.find((t) => t.status === "active")?.id} required>
                  {teachers
                    .filter((t) => t.status === "active")
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName}
                      </option>
                    ))}
                </Select>
              </Field>
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
                  <option value="face_to_face">Face-to-face (needs a room)</option>
                  <option value="online">Online (no room)</option>
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
              ) : null}
            </div>

            {conflicts.length > 0 ? (
              <div className="mt-4 rounded-xl border border-danger/30 bg-danger-soft p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-danger">
                  <AlertTriangle className="h-4 w-4" />
                  Conflict — blocked
                </div>
                <ul className="space-y-1 text-sm text-danger">
                  {conflicts.map((c) => (
                    <li key={c}>• {c}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="mt-6 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setShowScheduleForm(false);
                  setEditingSlot(null);
                  setConflicts([]);
                }}
              >
                Cancel
              </Button>
              {editingSlot ? <Button type="button" variant="danger-ghost" onClick={() => void handleDeleteSchedule(editingSlot)}>Delete</Button> : null}
              <Button type="submit">{editingSlot ? "Save changes" : "Save to calendar"}</Button>
            </div>
          </form>
        </div>
      ) : null}
      </div>

      {importStudentsOpen ? <ImportSectionStudentsModal sectionName={section.name} existingStudentIds={sectionStudents.map((student) => student.studentId)} onClose={() => setImportStudentsOpen(false)} onImport={handleStudentImport} /> : null}
    </div>
  );
}
