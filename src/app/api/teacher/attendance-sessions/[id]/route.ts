import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, ClassSchedule, Section, Student, StudentEnrollment, Subject, Teacher } from "@/backend/models";
import { lateCutoffMinutes, minutesLabel } from "@/backend/services/attendance-status";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);

/**
 * One attendance session with the section's full roster: each enrolled student
 * is present, late, or absent (not checked in). `attendance` keeps the plain
 * check-in list, including anyone checked in who has since left the roster.
 */
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Invalid attendance session ID." }, { status: 400 });
  try {
    await connectDB();
    const session = await AttendanceSession.findOne({ _id: id, teacherId: auth.user.teacherId }).lean();
    if (!session) return Response.json({ error: "Attendance session not found." }, { status: 404 });
    const [section, subject, teacher, schedule, records, enrollments] = await Promise.all([
      Section.findById(session.sectionId).select("name").lean(),
      Subject.findById(session.subjectId).select("code name").lean(),
      Teacher.findById(session.teacherId).select("firstName lastName").lean(),
      ClassSchedule.findById(session.scheduleId).select("startMinutes").lean(),
      AttendanceRecord.find({ sessionId: session._id }).sort({ checkedInAt: 1 }).lean(),
      StudentEnrollment.find({ sectionId: session.sectionId, termId: session.termId }).select("studentId").lean(),
    ]);
    const studentIds = [...new Set([...enrollments, ...records].map((item) => String(item.studentId)))];
    const students = await Student.find({ _id: { $in: studentIds } }).select("studentNumber name").sort({ name: 1 }).lean();
    const studentById = new Map(students.map((student) => [String(student._id), student]));
    const recordByStudent = new Map(records.map((record) => [String(record.studentId), record]));
    const enrolledIds = new Set(enrollments.map((item) => String(item.studentId)));

    const roster = students
      .filter((student) => enrolledIds.has(String(student._id)))
      .map((student) => {
        const record = recordByStudent.get(String(student._id));
        return {
          studentId: String(student._id),
          studentNumber: student.studentNumber,
          studentName: student.name,
          status: record?.status ?? "absent",
          checkedInAt: record?.checkedInAt ?? null,
          source: record?.source ?? null,
        };
      });
    const count = (status: string) => roster.filter((entry) => entry.status === status).length;

    return Response.json({
      session: {
        id: String(session._id),
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        section: section?.name ?? "Section unavailable",
        subject: subject ? `${subject.code} — ${subject.name}` : "Subject unavailable",
        teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher",
        lateAfter: minutesLabel(lateCutoffMinutes(session.startedAt, schedule?.startMinutes ?? 0)),
      },
      summary: { enrolled: roster.length, present: count("present"), late: count("late"), absent: count("absent") },
      roster,
      attendance: records.map((record) => {
        const student = studentById.get(String(record.studentId));
        return { id: String(record._id), studentNumber: student?.studentNumber ?? "—", studentName: student?.name ?? "Student unavailable", checkedInAt: record.checkedInAt, status: record.status };
      }),
    });
  } catch (error) {
    console.error("Teacher attendance session detail failed:", error);
    return Response.json({ error: "Could not load this attendance session." }, { status: 500 });
  }
}
