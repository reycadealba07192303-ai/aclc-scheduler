import { z } from "zod";
import { requireTeacher } from "@/backend/auth/scope";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, ClassSchedule, Section, Subject, Teacher } from "@/backend/models";
import { notifySectionStudents } from "@/backend/services/notifications";
import { attendanceWindow } from "@/backend/services/attendance-status";
import { audit } from "@/backend/services/audit";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const createSchema = z.object({ scheduleId: objectId });

export async function GET(request: Request) {
  const auth = await requireTeacher();
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const { teacherId } = auth;
    const sectionId = new URL(request.url).searchParams.get("sectionId");
    if (sectionId && !objectId.safeParse(sectionId).success) return Response.json({ error: "Invalid section ID." }, { status: 400 });
    const filter: Record<string, unknown> = { teacherId, status: "active" };
    if (sectionId) filter.sectionId = sectionId;
    const sessions = await AttendanceSession.find(filter).sort({ startedAt: -1 }).lean();
    const [subjects, records] = await Promise.all([
      Subject.find({ _id: { $in: sessions.map((item) => item.subjectId) } }).select("code name").lean(),
      AttendanceRecord.aggregate([
        { $match: { sessionId: { $in: sessions.map((item) => item._id) } } },
        { $group: { _id: "$sessionId", count: { $sum: 1 } } },
      ]),
    ]);
    const subjectById = new Map(subjects.map((item) => [String(item._id), item]));
    const countBySession = new Map(records.map((item) => [String(item._id), item.count]));
    return Response.json({ sessions: sessions.map((item) => ({
      id: String(item._id),
      scheduleId: String(item.scheduleId),
      sectionId: String(item.sectionId),
      subject: subjectById.get(String(item.subjectId)) ?? null,
      startedAt: item.startedAt,
      attendanceCount: countBySession.get(String(item._id)) ?? 0,
    })) });
  } catch (error) {
    console.error("Teacher attendance sessions load failed:", error);
    return Response.json({ error: "Could not load active attendance sessions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireTeacher();
  if (auth.response) return auth.response;
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Choose one of your scheduled classes." }, { status: 400 });
  try {
    await connectDB();
    const { teacherId } = auth;
    const schedule = await ClassSchedule.findOne({ _id: parsed.data.scheduleId, teacherId }).lean();
    if (!schedule) return Response.json({ error: "This class is not assigned to your teacher account." }, { status: 404 });
    const section = await Section.findById(schedule.sectionId).select("_id termId").lean();
    if (!section || String(section.termId) !== String(schedule.termId)) return Response.json({ error: "The class section is no longer available." }, { status: 409 });

    let session = await AttendanceSession.findOne({ scheduleId: schedule._id, status: "active" });
    if (!session) {
      // A new session may only start during the class's scheduled time.
      const window = attendanceWindow(schedule);
      if (!window.open) return Response.json({ error: window.message, code: "outside_schedule" }, { status: 409 });
      try {
        session = await AttendanceSession.create({
          scheduleId: schedule._id,
          termId: schedule.termId,
          sectionId: schedule.sectionId,
          subjectId: schedule.subjectId,
          teacherId,
          status: "active",
          startedAt: new Date(),
        });
        const subject = await Subject.findById(schedule.subjectId).select("code name").lean();
        await audit(auth.user, "attendance", "attendance.open", `Opened attendance for ${subject?.code ?? "a class"}`, { type: "attendanceSession", id: String(session._id) });
        await notifySectionStudents(schedule.sectionId, schedule.termId, {
          type: "attendance",
          title: `Attendance is open: ${subject?.code ?? "your class"}`,
          body: `${subject?.name ?? "Your teacher"} is taking attendance. Open Attendance and show your QR.`,
          link: "/student/attendance",
        });
      } catch (error) {
        if (!(typeof error === "object" && error !== null && "code" in error && error.code === 11000)) throw error;
        session = await AttendanceSession.findOne({ scheduleId: schedule._id, status: "active" });
      }
    }
    if (!session) throw new Error("Attendance session could not be started.");
    return Response.json({ id: String(session._id) }, { status: 201 });
  } catch (error) {
    console.error("Teacher attendance session start failed:", error);
    return Response.json({ error: "Could not start attendance for this class." }, { status: 500 });
  }
}
