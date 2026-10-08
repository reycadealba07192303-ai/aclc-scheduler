import { requireStudent } from "@/backend/auth/scope";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, Program, Section, Student, Subject, Teacher } from "@/backend/models";
import { findCurrentEnrollment } from "@/backend/services/student-enrollment";
import { issueStudentAttendanceToken, QR_TOKEN_SECONDS, tokenExpiry } from "@/backend/services/attendance-qr";

export async function GET() {
  const auth = await requireStudent();
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const { studentId } = auth;
    const current = await findCurrentEnrollment(studentId);
    if (!current) return Response.json({ sessions: [] });
    const { term, enrollment } = current;
    const activeSessions = await AttendanceSession.find({ sectionId: enrollment.sectionId, termId: term._id, status: "active" }).sort({ startedAt: -1 }).lean();
    const [student, section, program, subjects, teachers, records] = await Promise.all([
      Student.findById(studentId).select("name studentNumber").lean(),
      Section.findById(enrollment.sectionId).select("name programId").lean(),
      Section.findById(enrollment.sectionId).select("programId").lean().then((item) => item ? Program.findById(item.programId).select("code").lean() : null),
      Subject.find({ _id: { $in: activeSessions.map((session) => session.subjectId) } }).select("code name").lean(),
      Teacher.find({ _id: { $in: activeSessions.map((session) => session.teacherId) } }).select("firstName lastName").lean(),
      AttendanceRecord.find({ studentId, sessionId: { $in: activeSessions.map((session) => session._id) } }).select("sessionId checkedInAt status").lean(),
    ]);
    const subjectById = new Map(subjects.map((item) => [String(item._id), item]));
    const teacherById = new Map(teachers.map((item) => [String(item._id), `${item.firstName} ${item.lastName}`]));
    const recordBySession = new Map(records.map((item) => [String(item.sessionId), item]));
    const qrNow = Date.now();
    return Response.json({
      student: { name: student?.name ?? "Student", studentNumber: student?.studentNumber ?? "" },
      section: { name: section?.name ?? "Your section", program: program?.code ?? "" },
      sessions: activeSessions.map((session) => ({
        id: String(session._id),
        subject: subjectById.get(String(session.subjectId)) ?? { code: "", name: "Subject" },
        teacher: teacherById.get(String(session.teacherId)) ?? "Teacher",
        startedAt: session.startedAt,
        checkedIn: recordBySession.has(String(session._id)),
        checkedInAt: recordBySession.get(String(session._id))?.checkedInAt ?? null,
        status: recordBySession.get(String(session._id))?.status ?? null,
        qr: recordBySession.has(String(session._id)) ? null : {
          value: issueStudentAttendanceToken(String(session._id), String(studentId), qrNow),
          expiresAt: tokenExpiry(qrNow),
          validForSeconds: QR_TOKEN_SECONDS,
        },
      })),
    });
  } catch (error) {
    console.error("Student active attendance sessions load failed:", error);
    return Response.json({ error: "Could not load active class attendance." }, { status: 500 });
  }
}
