import { requireStudent } from "@/backend/auth/scope";
import { memo } from "@/backend/cache/memo";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, Program, Section, Student, Subject, Teacher } from "@/backend/models";
import { findCurrentEnrollment } from "@/backend/services/student-enrollment";
import { issueStudentAttendanceToken, QR_TOKEN_SECONDS, tokenExpiry } from "@/backend/services/attendance-qr";

/** Names change rarely; cache them so polling students cost few database operations. */
const LABEL_CACHE_MS = 5 * 60_000;

const studentLabel = (studentId: string) => memo(`student-label:${studentId}`, LABEL_CACHE_MS, async () => {
  const student = await Student.findById(studentId).select("name studentNumber").lean();
  return { name: student?.name ?? "Student", studentNumber: student?.studentNumber ?? "" };
});

const sectionLabel = (sectionId: string) => memo(`section-label:${sectionId}`, LABEL_CACHE_MS, async () => {
  const section = await Section.findById(sectionId).select("name programId").lean();
  const program = section ? await Program.findById(section.programId).select("code").lean() : null;
  return { name: section?.name ?? "Your section", program: program?.code ?? "" };
});

const sessionLabel = (session: { _id: unknown; subjectId: unknown; teacherId: unknown }) =>
  memo(`session-label:${session._id}`, LABEL_CACHE_MS, async () => {
    const [subject, teacher] = await Promise.all([
      Subject.findById(session.subjectId).select("code name").lean(),
      Teacher.findById(session.teacherId).select("firstName lastName").lean(),
    ]);
    return {
      subject: subject ? { code: subject.code, name: subject.name } : { code: "", name: "Subject" },
      teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "Teacher",
    };
  });

/**
 * Open attendance for the signed-in student's section, each with a fresh
 * personal QR (or their check-in once scanned). Polled by the student portal,
 * so it is kept light: one query when nothing is open, two while it is.
 */
export async function GET() {
  const auth = await requireStudent();
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const { studentId } = auth;
    const current = await findCurrentEnrollment(studentId);
    if (!current) return Response.json({ sessions: [] });
    const { term, enrollment } = current;
    const activeSessions = await AttendanceSession.find({ sectionId: enrollment.sectionId, termId: term._id, status: "active" })
      .select("_id subjectId teacherId startedAt").sort({ startedAt: -1 }).lean();
    if (!activeSessions.length) return Response.json({ sessions: [] });

    const [student, section, labels, records] = await Promise.all([
      studentLabel(studentId),
      sectionLabel(String(enrollment.sectionId)),
      Promise.all(activeSessions.map(sessionLabel)),
      AttendanceRecord.find({ studentId, sessionId: { $in: activeSessions.map((session) => session._id) } }).select("sessionId checkedInAt status").lean(),
    ]);
    const recordBySession = new Map(records.map((item) => [String(item.sessionId), item]));
    const qrNow = Date.now();
    return Response.json({
      student,
      section,
      sessions: activeSessions.map((session, index) => {
        const record = recordBySession.get(String(session._id));
        return {
          id: String(session._id),
          subject: labels[index].subject,
          teacher: labels[index].teacher,
          startedAt: session.startedAt,
          checkedIn: Boolean(record),
          checkedInAt: record?.checkedInAt ?? null,
          status: record?.status ?? null,
          qr: record ? null : {
            value: issueStudentAttendanceToken(String(session._id), String(studentId), qrNow),
            expiresAt: tokenExpiry(qrNow),
            validForSeconds: QR_TOKEN_SECONDS,
          },
        };
      }),
    });
  } catch (error) {
    console.error("Student active attendance sessions load failed:", error);
    return Response.json({ error: "Could not load active class attendance." }, { status: 500 });
  }
}
