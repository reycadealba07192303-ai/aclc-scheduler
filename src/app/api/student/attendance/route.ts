import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { AttendanceRecord, Section, Subject, Teacher } from "@/backend/models";

export async function POST(request: Request) {
  void request;
  const auth = await requireRole("student");
  if (auth.response) return auth.response;
  return Response.json({ error: "Show your live student QR to your teacher. Teachers record attendance by scanning it." }, { status: 405 });
}

export async function GET() {
  const auth = await requireRole("student");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const studentId = auth.user.studentId;
    if (!studentId) return Response.json({ error: "This account is not linked to a student profile." }, { status: 403 });
    const records = await AttendanceRecord.find({ studentId }).sort({ checkedInAt: -1 }).limit(100).lean();
    const [subjects, sections, teachers] = await Promise.all([
      Subject.find({ _id: { $in: records.map((record) => record.subjectId) } }).select("code name").lean(),
      Section.find({ _id: { $in: records.map((record) => record.sectionId) } }).select("name").lean(),
      Teacher.find({ _id: { $in: records.map((record) => record.teacherId) } }).select("firstName lastName").lean(),
    ]);
    const subjectById = new Map(subjects.map((item) => [String(item._id), item]));
    const sectionById = new Map(sections.map((item) => [String(item._id), item]));
    const teacherById = new Map(teachers.map((item) => [String(item._id), `${item.firstName} ${item.lastName}`]));
    return Response.json({ records: records.map((record) => {
      const subject = subjectById.get(String(record.subjectId));
      return {
      id: String(record._id),
      subject: subject ? `${subject.code} — ${subject.name}` : "Subject unavailable",
      subjectCode: subject?.code ?? "",
      subjectName: subject?.name ?? "Subject unavailable",
      section: sectionById.get(String(record.sectionId))?.name ?? "Section unavailable",
      teacher: teacherById.get(String(record.teacherId)) ?? "Teacher unavailable",
      checkedInAt: record.checkedInAt,
      status: record.status,
      };
    }) });
  } catch (error) {
    console.error("Student attendance history load failed:", error);
    return Response.json({ error: "Could not load your attendance history." }, { status: 500 });
  }
}
