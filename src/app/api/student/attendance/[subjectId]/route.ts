import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, Subject, Teacher } from "@/backend/models";
import { findCurrentEnrollment } from "@/backend/services/student-enrollment";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

/**
 * The signed-in student's attendance for one subject of their current section:
 * every session the teacher ran since the student was enrolled, marked present,
 * late, absent (closed without a check-in), or open (still running, not yet scanned).
 */
export async function GET(_request: Request, context: { params: Promise<{ subjectId: string }> }) {
  const auth = await requireRole("student");
  if (auth.response) return auth.response;
  const { subjectId } = await context.params;
  if (!idSchema.safeParse(subjectId).success) return Response.json({ error: "Invalid subject." }, { status: 400 });
  try {
    await connectDB();
    const studentId = auth.user.studentId;
    if (!studentId) return Response.json({ error: "This account is not linked to a student profile." }, { status: 403 });
    const current = await findCurrentEnrollment(studentId);
    if (!current) return Response.json({ error: "You are not enrolled in a section this term." }, { status: 404 });
    const { term, enrollment } = current;
    const [subject, sessions] = await Promise.all([
      Subject.findById(subjectId).select("code name").lean(),
      AttendanceSession.find({
        termId: term._id,
        sectionId: enrollment.sectionId,
        subjectId,
        startedAt: { $gte: enrollment.createdAt },
      }).sort({ startedAt: -1 }).lean(),
    ]);
    if (!subject) return Response.json({ error: "Subject not found." }, { status: 404 });
    const [records, teachers] = await Promise.all([
      AttendanceRecord.find({ studentId, sessionId: { $in: sessions.map((item) => item._id) } }).select("sessionId checkedInAt status").lean(),
      Teacher.find({ _id: { $in: sessions.map((item) => item.teacherId) } }).select("firstName lastName").lean(),
    ]);
    const recordBySession = new Map(records.map((item) => [String(item.sessionId), item]));
    const teacherById = new Map(teachers.map((item) => [String(item._id), `${item.firstName} ${item.lastName}`]));
    const rows = sessions.map((session) => {
      const record = recordBySession.get(String(session._id));
      const checkedInAt = record?.checkedInAt ?? null;
      return {
        id: String(session._id),
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        teacher: teacherById.get(String(session.teacherId)) ?? "Teacher",
        checkedInAt,
        result: record ? record.status : session.status === "active" ? "open" : "absent",
      };
    });
    return Response.json({
      subject: { code: subject.code, name: subject.name },
      summary: {
        held: rows.filter((row) => row.result !== "open").length,
        present: rows.filter((row) => row.result === "present").length,
        late: rows.filter((row) => row.result === "late").length,
        absent: rows.filter((row) => row.result === "absent").length,
      },
      sessions: rows,
    });
  } catch (error) {
    console.error("Student subject attendance load failed:", error);
    return Response.json({ error: "Could not load attendance for this subject." }, { status: 500 });
  }
}
