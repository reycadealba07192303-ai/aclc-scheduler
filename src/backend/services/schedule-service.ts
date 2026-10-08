import { ClassSchedule, Program, Room, Section, Subject, Teacher, Term } from "@/backend/models";
import type { ScheduleSlot } from "@/shared/types";
import { scheduleInputSchema } from "@/backend/validation/schedule-schemas";

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

const toHHMM = (minutes: number) => {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
};

const toDatabaseDay = (uiDay: number) => (uiDay + 6) % 7;
const toUiDay = (databaseDay: number) => (databaseDay === 6 ? 0 : databaseDay + 1);

export function serializeSchedule(document: {
  _id: unknown;
  sectionId: unknown;
  subjectId: unknown;
  teacherId: unknown;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  mode: "f2f" | "online";
  roomId?: unknown;
}): ScheduleSlot {
  return {
    id: String(document._id),
    sectionId: String(document.sectionId),
    subjectId: String(document.subjectId),
    teacherId: String(document.teacherId),
    dayOfWeek: toUiDay(document.dayOfWeek),
    startTime: toHHMM(document.startMinutes),
    endTime: toHHMM(document.endMinutes),
    modality: document.mode === "f2f" ? "face_to_face" : "online",
    ...(document.roomId ? { roomId: String(document.roomId) } : {}),
  };
}

export class ScheduleRequestError extends Error {
  status: number;
  conflicts?: string[];

  constructor(message: string, status = 400, conflicts?: string[]) {
    super(message);
    this.name = "ScheduleRequestError";
    this.status = status;
    this.conflicts = conflicts;
  }
}

export async function saveScheduleDraft(body: unknown, excludeId?: string): Promise<ScheduleSlot> {
  const parsed = scheduleInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new ScheduleRequestError("Invalid schedule data.", 400);
  }
  const draft = parsed.data;
  const startMinutes = toMinutes(draft.startTime);
  const endMinutes = toMinutes(draft.endTime);
  if (startMinutes < 420 || endMinutes > 1260 || startMinutes % 30 !== 0 || endMinutes % 30 !== 0) {
    throw new ScheduleRequestError("Schedule times must use 30-minute slots between 7:00 AM and 9:00 PM.", 400);
  }
  if (endMinutes <= startMinutes) {
    throw new ScheduleRequestError("End time must be after the start time.", 400);
  }
  if (draft.modality === "face_to_face" && !draft.roomId) {
    throw new ScheduleRequestError("Face-to-face classes require a classroom.", 400);
  }

  const [section, subject, teacher, room] = await Promise.all([
    Section.findById(draft.sectionId),
    Subject.findById(draft.subjectId),
    Teacher.findById(draft.teacherId),
    draft.modality === "face_to_face" && draft.roomId ? Room.findById(draft.roomId) : Promise.resolve(null),
  ]);
  if (!section) throw new ScheduleRequestError("Selected section was not found.", 404);
  if (!subject) throw new ScheduleRequestError("Selected subject was not found.", 404);
  if (!teacher || teacher.status !== "active") throw new ScheduleRequestError("Select an active professor.", 400);
  if (draft.modality === "face_to_face" && !room) throw new ScheduleRequestError("Selected classroom was not found.", 404);

  const [term, program] = await Promise.all([
    Term.findById(section.termId),
    Program.findById(section.programId),
  ]);
  if (!term || !program) throw new ScheduleRequestError("The section's term or program was not found.", 404);
  if (subject.track !== program.track) {
    throw new ScheduleRequestError("That subject does not belong to the selected program's track.", 400);
  }
  if (program.curriculum.length > 0) {
    const isInCurriculum = program.curriculum.some((course) =>
      course.code.toUpperCase() === subject.code.toUpperCase() &&
      course.yearLevel === section.yearLevel &&
      (term.semester === "Summer" || course.semester === term.semester),
    );
    if (!isInCurriculum) {
      throw new ScheduleRequestError("That subject is not in this section's level and semester curriculum.", 400);
    }
  }

  const databaseDay = toDatabaseDay(draft.dayOfWeek);
  const existingSlots = await ClassSchedule.find({
    termId: section.termId,
    dayOfWeek: databaseDay,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  }).lean();
  const conflicts: string[] = [];

  for (const existing of existingSlots) {
    if (!(startMinutes < existing.endMinutes && existing.startMinutes < endMinutes)) continue;
    if (
      draft.modality === "face_to_face" &&
      existing.mode === "f2f" &&
      draft.roomId &&
      String(existing.roomId) === draft.roomId
    ) {
      conflicts.push(`Room already booked at ${toHHMM(existing.startMinutes)}–${toHHMM(existing.endMinutes)}`);
    }
    if (String(existing.teacherId) === draft.teacherId) {
      conflicts.push("Professor already has a class at this time");
    }
    if (String(existing.sectionId) === draft.sectionId) {
      conflicts.push("Section already has a class at this time");
    }
  }
  if (conflicts.length) {
    const uniqueConflicts = [...new Set(conflicts)];
    throw new ScheduleRequestError(uniqueConflicts.join("; "), 409, uniqueConflicts);
  }

  const data = {
    termId: section.termId,
    sectionId: section._id,
    subjectId: subject._id,
    teacherId: teacher._id,
    dayOfWeek: databaseDay,
    startMinutes,
    endMinutes,
    mode: draft.modality === "face_to_face" ? "f2f" as const : "online" as const,
    roomId: draft.modality === "face_to_face" ? room?._id : null,
  };
  const saved = excludeId
    ? await ClassSchedule.findByIdAndUpdate(excludeId, data, { new: true, runValidators: true })
    : await ClassSchedule.create(data);
  if (!saved) throw new ScheduleRequestError("Schedule slot was not found.", 404);
  return serializeSchedule(saved as unknown as Parameters<typeof serializeSchedule>[0]);
}
