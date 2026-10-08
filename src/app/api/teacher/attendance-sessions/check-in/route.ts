import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, ClassSchedule, Student, StudentEnrollment, Subject } from "@/backend/models";
import { notify } from "@/backend/services/notifications";
import { checkInStatus } from "@/backend/services/attendance-status";
import { verifyStudentAttendanceToken } from "@/backend/services/attendance-qr";

const checkInSchema = z.object({ token: z.string().min(1).max(512) });

export async function POST(request: Request) {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  const parsed = checkInSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Scan a student's current attendance QR." }, { status: 400 });
  const payload = verifyStudentAttendanceToken(parsed.data.token);
  if (!payload) return Response.json({ error: "This student QR expired. Ask them to refresh it and scan again." }, { status: 400 });

  try {
    await connectDB();
    const teacherId = auth.user.teacherId;
    if (!teacherId) return Response.json({ error: "This account is not linked to a teacher profile." }, { status: 403 });
    const [student, session] = await Promise.all([
      Student.findOne({ _id: payload.studentId, status: { $ne: "inactive" } }).select("_id studentNumber name").lean(),
      AttendanceSession.findOne({ _id: payload.sessionId, teacherId, status: "active" }).lean(),
    ]);
    if (!session) return Response.json({ error: "This class attendance is closed or is not assigned to you." }, { status: 409 });
    if (!student) return Response.json({ error: "This student account is inactive or unavailable." }, { status: 403 });
    const [enrolled, schedule] = await Promise.all([
      StudentEnrollment.exists({ studentId: student._id, termId: session.termId, sectionId: session.sectionId }),
      ClassSchedule.findById(session.scheduleId).select("startMinutes").lean(),
    ]);
    if (!enrolled) return Response.json({ error: "This student is not enrolled in this class section." }, { status: 403 });

    try {
      const checkedInAt = new Date();
      const record = await AttendanceRecord.create({
        sessionId: session._id,
        termId: session.termId,
        sectionId: session.sectionId,
        subjectId: session.subjectId,
        teacherId,
        studentId: student._id,
        checkedInAt,
        status: checkInStatus(checkedInAt, session.startedAt, schedule?.startMinutes ?? 0),
        source: "qr",
      });
      const subject = await Subject.findById(session.subjectId).select("code name").lean();
      await notify("student", [student._id], {
        type: "attendance",
        title: `Marked ${record.status}: ${subject?.code ?? "class"}`,
        body: `${subject?.name ?? "Your class"} · checked in at ${checkedInAt.toLocaleTimeString("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" })}`,
        link: "/student/attendance",
      });
      return Response.json({
        ok: true,
        student: { id: String(student._id), studentNumber: student.studentNumber, name: student.name },
        checkedInAt: record.checkedInAt,
        status: record.status,
      }, { status: 201 });
    } catch (error) {
      if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
        return Response.json({ error: "This student is already checked in for this class." }, { status: 409 });
      }
      throw error;
    }
  } catch (error) {
    console.error("Teacher student QR check-in failed:", error);
    return Response.json({ error: "Could not record this student's attendance." }, { status: 500 });
  }
}
