import { getCurrentUser } from "@/backend/auth/auth";
import { findCurrentEnrollment } from "@/backend/services/student-enrollment";
import {
  AttendanceRecord,
  AttendanceSession,
  AuthAccount,
  ClassSchedule,
  Program,
  Section,
  Student,
  Teacher,
  Term,
} from "@/backend/models";

type Item = { label: string; value: string };
const termLabel = (term: { startYear: number; semester: string } | null | undefined) =>
  term ? `A.Y. ${term.startYear}-${term.startYear + 1} · ${term.semester}` : "No active term";

/** The signed-in user's profile: identity details and a few role-specific numbers. */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    const account = await AuthAccount.findById(user.id).select("createdAt").lean();
    const details: Item[] = [{ label: "Email", value: user.email }];
    const stats: Item[] = [];

    if (user.role === "admin") {
      details.push({ label: "Role", value: "Super Administrator" });
      const [teachers, students, sections, classes] = await Promise.all([
        Teacher.countDocuments({ status: "active" }),
        Student.countDocuments({ status: { $ne: "inactive" } }),
        Section.countDocuments(),
        ClassSchedule.countDocuments(),
      ]);
      stats.push(
        { label: "Active teachers", value: String(teachers) },
        { label: "Students", value: String(students) },
        { label: "Sections", value: String(sections) },
        { label: "Scheduled classes", value: String(classes) },
      );
    } else if (user.role === "teacher") {
      const teacher = await Teacher.findById(user.teacherId).select("employeeNumber").lean();
      const term = await Term.findOne().sort({ startYear: -1, semester: -1 }).lean();
      const [classes, sessions] = await Promise.all([
        ClassSchedule.find({ teacherId: user.teacherId, ...(term ? { termId: term._id } : {}) }).select("sectionId").lean(),
        AttendanceSession.countDocuments({ teacherId: user.teacherId }),
      ]);
      details.push(
        { label: "Employee number", value: teacher?.employeeNumber ?? "—" },
        { label: "Role", value: "Teacher" },
        { label: "Current term", value: termLabel(term) },
      );
      stats.push(
        { label: "Handled classes", value: String(classes.length) },
        { label: "Sections", value: String(new Set(classes.map((item) => String(item.sectionId))).size) },
        { label: "Attendance sessions run", value: String(sessions) },
      );
    } else {
      details.push({ label: "Student number", value: user.studentNumber ?? "—" }, { label: "Role", value: "Student" });
      const current = user.studentId ? await findCurrentEnrollment(user.studentId) : null;
      if (current) {
        const section = await Section.findById(current.enrollment.sectionId).select("name yearLevel programId").lean();
        const program = section ? await Program.findById(section.programId).select("code").lean() : null;
        const [classes, held, records] = await Promise.all([
          ClassSchedule.countDocuments({ sectionId: current.enrollment.sectionId, termId: current.term._id }),
          AttendanceSession.find({ sectionId: current.enrollment.sectionId, termId: current.term._id, status: "closed", startedAt: { $gte: current.enrollment.createdAt } }).select("_id").lean(),
          AttendanceRecord.countDocuments({ studentId: user.studentId, termId: current.term._id }),
        ]);
        const attendedHeld = held.length
          ? await AttendanceRecord.countDocuments({ studentId: user.studentId, sessionId: { $in: held.map((item) => item._id) } })
          : 0;
        details.push(
          { label: "Section", value: section?.name ?? "—" },
          { label: "Program", value: program?.code ?? "—" },
          { label: "Year level", value: section?.yearLevel ?? "—" },
          { label: "Current term", value: termLabel(current.term) },
        );
        stats.push(
          { label: "Classes this term", value: String(classes) },
          { label: "Classes attended", value: String(records) },
          { label: "Attendance rate", value: held.length ? `${Math.round((attendedHeld / held.length) * 100)}%` : "—" },
        );
      } else {
        details.push({ label: "Section", value: "Not enrolled this term" });
      }
    }

    return Response.json({
      profile: { name: user.name, role: user.role, memberSince: account?.createdAt ?? null, details, stats },
    });
  } catch (error) {
    console.error("Profile load failed:", error);
    return Response.json({ error: "Could not load your profile." }, { status: 500 });
  }
}
