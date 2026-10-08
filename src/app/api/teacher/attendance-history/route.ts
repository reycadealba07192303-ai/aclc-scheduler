import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, Section, Student, StudentEnrollment, Subject, Term } from "@/backend/models";

const MAX_RANGE_MS = 31 * 24 * 60 * 60 * 1000;
const SUBJECT_HISTORY_LIMIT = 100;
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const rangeSchema = z.object({ from: z.coerce.date(), to: z.coerce.date() })
  .refine(({ from, to }) => to > from && to.getTime() - from.getTime() <= MAX_RANGE_MS);
const subjectSchema = z.object({ sectionId: objectId, subjectId: objectId });

/**
 * Attendance sessions the signed-in teacher ran, newest first, each with its
 * check-in list. Query either one subject's history (`sectionId` + `subjectId`,
 * latest 100 sessions, plus a `report` with the term, teacher, and enrolled
 * roster for exporting a class attendance sheet) or a date range (`from` + `to`, up to 31 days). For date
 * ranges the client sends its own local-day boundaries so "today" follows the
 * teacher's device time zone.
 */
export async function GET(request: Request) {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  const params = new URL(request.url).searchParams;
  let filter: Record<string, unknown>;
  let subjectQuery: z.infer<typeof subjectSchema> | null = null;
  if (params.has("subjectId") || params.has("sectionId")) {
    const parsed = subjectSchema.safeParse({ sectionId: params.get("sectionId"), subjectId: params.get("subjectId") });
    if (!parsed.success) return Response.json({ error: "Choose one of your subjects." }, { status: 400 });
    filter = parsed.data;
    subjectQuery = parsed.data;
  } else {
    const parsed = rangeSchema.safeParse({ from: params.get("from"), to: params.get("to") });
    if (!parsed.success) return Response.json({ error: "Choose a valid date range of up to 31 days." }, { status: 400 });
    filter = { startedAt: { $gte: parsed.data.from, $lt: parsed.data.to } };
  }
  try {
    await connectDB();
    const teacherId = auth.user.teacherId;
    if (!teacherId) return Response.json({ error: "This account is not linked to a teacher profile." }, { status: 403 });
    const sessions = await AttendanceSession.find({ ...filter, teacherId })
      .sort({ startedAt: -1 })
      .limit(SUBJECT_HISTORY_LIMIT)
      .lean();
    const report = subjectQuery ? await loadSubjectReport(subjectQuery.sectionId, auth.user.name) : null;
    if (!sessions.length) return Response.json({ sessions: [], ...(report ? { report } : {}) });

    const [sections, subjects, records, enrollmentCounts] = await Promise.all([
      Section.find({ _id: { $in: sessions.map((item) => item.sectionId) } }).select("name").lean(),
      Subject.find({ _id: { $in: sessions.map((item) => item.subjectId) } }).select("code name").lean(),
      AttendanceRecord.find({ sessionId: { $in: sessions.map((item) => item._id) } }).sort({ checkedInAt: 1 }).lean(),
      StudentEnrollment.aggregate<{ _id: { sectionId: unknown; termId: unknown }; count: number }>([
        { $match: { $or: sessions.map((item) => ({ sectionId: item.sectionId, termId: item.termId })) } },
        { $group: { _id: { sectionId: "$sectionId", termId: "$termId" }, count: { $sum: 1 } } },
      ]),
    ]);
    const students = await Student.find({ _id: { $in: records.map((item) => item.studentId) } }).select("studentNumber name").lean();
    const sectionById = new Map(sections.map((item) => [String(item._id), item.name]));
    const subjectById = new Map(subjects.map((item) => [String(item._id), item]));
    const studentById = new Map(students.map((item) => [String(item._id), item]));
    const enrolledBySection = new Map(enrollmentCounts.map((item) => [`${item._id.sectionId}:${item._id.termId}`, item.count]));

    return Response.json({
      sessions: sessions.map((session) => {
        const subject = subjectById.get(String(session.subjectId));
        const attendance = records
          .filter((record) => String(record.sessionId) === String(session._id))
          .map((record) => {
            const student = studentById.get(String(record.studentId));
            return {
              id: String(record._id),
              studentNumber: student?.studentNumber ?? "—",
              studentName: student?.name ?? "Student unavailable",
              checkedInAt: record.checkedInAt,
              status: record.status,
            };
          });
        return {
          id: String(session._id),
          scheduleId: String(session.scheduleId),
          status: session.status,
          startedAt: session.startedAt,
          endedAt: session.endedAt,
          section: sectionById.get(String(session.sectionId)) ?? "Section unavailable",
          subject: subject ? { code: subject.code, name: subject.name } : { code: "", name: "Subject unavailable" },
          enrolledCount: enrolledBySection.get(`${session.sectionId}:${session.termId}`) ?? 0,
          attendance,
        };
      }),
      ...(report ? { report } : {}),
    });
  } catch (error) {
    console.error("Teacher attendance history load failed:", error);
    return Response.json({ error: "Could not load your attendance history." }, { status: 500 });
  }
}

/** Term label, teacher name, and the section's enrolled students (by name) for an attendance sheet. */
async function loadSubjectReport(sectionId: string, teacher: string) {
  const section = await Section.findById(sectionId).select("termId").lean();
  if (!section) return { teacher, term: "", roster: [] };
  const [term, enrollments] = await Promise.all([
    Term.findById(section.termId).lean(),
    StudentEnrollment.find({ sectionId, termId: section.termId }).select("studentId").lean(),
  ]);
  const students = await Student.find({ _id: { $in: enrollments.map((item) => item.studentId) } })
    .select("studentNumber name")
    .sort({ name: 1 })
    .lean();
  return {
    teacher,
    term: term ? `A.Y. ${term.startYear}-${term.startYear + 1} · ${term.semester}` : "",
    roster: students.map((student) => ({ studentNumber: student.studentNumber, studentName: student.name })),
  };
}
