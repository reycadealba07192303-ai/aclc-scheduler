import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { ClassSchedule, Program, Room, Section, Subject, Teacher, Term } from "@/backend/models";
import { serializeSchedule } from "@/backend/services/schedule-service";
import { toHHMM } from "@/shared/lib/time";

function serialize(document: Record<string, unknown>) {
  const fields = { ...document };
  const id = String(fields._id);
  delete fields._id;
  delete fields.__v;
  return { ...fields, id };
}

export async function GET() {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const teacherId = auth.user.teacherId;
    if (!teacherId) return Response.json({ error: "This account is not linked to a teacher profile." }, { status: 403 });
    const [terms, rooms, teacher, schedules, bookingDocs] = await Promise.all([
      Term.find().sort({ startYear: -1, semester: -1 }).lean(),
      Room.find().sort({ name: 1, building: 1 }).lean(),
      Teacher.findOne({ _id: teacherId, status: "active" }).lean(),
      ClassSchedule.find({ teacherId }).sort({ dayOfWeek: 1, startMinutes: 1 }).lean(),
      ClassSchedule.find({ mode: "f2f" }).select("_id termId dayOfWeek startMinutes endMinutes roomId").lean(),
    ]);
    if (!teacher) return Response.json({ error: "The linked teacher profile is no longer active." }, { status: 403 });
    const sectionIds = [...new Set(schedules.map((item) => String(item.sectionId)))];
    const subjectIds = [...new Set(schedules.map((item) => String(item.subjectId)))];
    const sections = await Section.find({ _id: { $in: sectionIds } }).sort({ name: 1 }).lean();
    const programIds = [...new Set(sections.map((item) => String(item.programId)))];
    const [programs, subjects] = await Promise.all([
      Program.find({ _id: { $in: programIds } }).sort({ code: 1 }).lean(),
      Subject.find({ _id: { $in: subjectIds } }).sort({ code: 1 }).lean(),
    ]);
    const programCodes = new Map(programs.map((item) => [String(item._id), item.code]));
    return Response.json({
      terms: terms.map((item) => serialize(item as unknown as Record<string, unknown>)),
      programs: programs.map((item) => serialize(item as unknown as Record<string, unknown>)),
      subjects: subjects.map((item) => serialize(item as unknown as Record<string, unknown>)),
      rooms: rooms.map((item) => serialize(item as unknown as Record<string, unknown>)),
      teachers: [serialize(teacher as unknown as Record<string, unknown>)],
      admins: [],
      sections: sections.map((item) => ({
        id: String(item._id),
        termId: String(item.termId),
        name: item.name,
        program: programCodes.get(String(item.programId)) ?? "",
        yearLevel: item.yearLevel,
      })),
      schedules: schedules.map((item) => ({
        ...serializeSchedule(item as unknown as Parameters<typeof serializeSchedule>[0]),
        termId: String(item.termId),
      })),
      roomBookings: bookingDocs.map((item) => ({
        id: String(item._id),
        termId: String(item.termId),
        dayOfWeek: item.dayOfWeek === 6 ? 0 : item.dayOfWeek + 1,
        startTime: toHHMM(item.startMinutes),
        endTime: toHHMM(item.endMinutes),
        ...(item.roomId ? { roomId: String(item.roomId) } : {}),
      })),
    });
  } catch (error) {
    console.error("Teacher portal data load failed:", error);
    return Response.json({ error: "Could not load your teacher portal data." }, { status: 500 });
  }
}
