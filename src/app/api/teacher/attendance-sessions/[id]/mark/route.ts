import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, AttendanceSession, StudentEnrollment, Subject } from "@/backend/models";
import { notify } from "@/backend/services/notifications";

const objectId = z.string().regex(/^[a-f\d]{24}$/i);
const markSchema = z.object({ studentId: objectId, status: z.enum(["present", "late", "absent"]) });

/**
 * Lets the teacher set a student's status by hand, e.g. when a QR will not
 * scan or to correct a mistake. Works on open and closed sessions.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("teacher");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  const parsed = markSchema.safeParse(await request.json().catch(() => null));
  if (!objectId.safeParse(id).success || !parsed.success) return Response.json({ error: "Choose a student and a status." }, { status: 400 });
  try {
    await connectDB();
    const session = await AttendanceSession.findOne({ _id: id, teacherId: auth.user.teacherId }).lean();
    if (!session) return Response.json({ error: "Attendance session not found." }, { status: 404 });
    const { studentId, status } = parsed.data;
    const enrolled = await StudentEnrollment.exists({ studentId, termId: session.termId, sectionId: session.sectionId });
    if (!enrolled) return Response.json({ error: "This student is not enrolled in this class section." }, { status: 403 });

    if (status === "absent") {
      await AttendanceRecord.deleteOne({ sessionId: session._id, studentId });
    } else {
      await AttendanceRecord.updateOne(
        { sessionId: session._id, studentId },
        {
          $set: { status, source: "manual" },
          $setOnInsert: {
            termId: session.termId,
            sectionId: session.sectionId,
            subjectId: session.subjectId,
            teacherId: session.teacherId,
            checkedInAt: new Date(),
          },
        },
        { upsert: true, runValidators: true },
      );
    }
    const subject = await Subject.findById(session.subjectId).select("code name").lean();
    const day = session.startedAt.toLocaleDateString("en-PH", { timeZone: "Asia/Manila", weekday: "short", month: "short", day: "numeric" });
    await notify("student", [studentId], {
      type: "attendance",
      title: `Attendance updated: ${subject?.code ?? "class"}`,
      body: `Your teacher marked you ${status} for ${subject?.name ?? "the class"} on ${day}.`,
      link: "/student",
    });
    return Response.json({ ok: true, status });
  } catch (error) {
    console.error("Teacher manual attendance mark failed:", error);
    return Response.json({ error: "Could not update this student's attendance." }, { status: 500 });
  }
}
