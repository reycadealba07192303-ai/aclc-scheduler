import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { ClassSchedule, Program, Room, Section, StudentEnrollment, Subject, Teacher, Term } from "@/backend/models";
import { toHHMM } from "@/shared/lib/time";

export async function GET() {
  const auth = await requireRole("student");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const studentId = auth.user.studentId;
    if (!studentId) return Response.json({ error: "This account is not linked to a student profile." }, { status: 403 });
    const enrollments = await StudentEnrollment.find({ studentId }).lean();
    if (!enrollments.length) return Response.json({ student: { name: auth.user.name, studentNumber: auth.user.studentNumber }, term: null, section: null, classes: [] });

    const terms = await Term.find({ _id: { $in: enrollments.map((item) => item.termId) } }).lean();
    const semesterOrder: Record<string, number> = { "1st Semester": 1, "2nd Semester": 2, Summer: 3 };
    terms.sort((a, b) => b.startYear - a.startYear || semesterOrder[b.semester] - semesterOrder[a.semester]);
    const term = terms[0];
    const enrollment = enrollments.find((item) => String(item.termId) === String(term._id));
    if (!enrollment) return Response.json({ student: { name: auth.user.name, studentNumber: auth.user.studentNumber }, term: null, section: null, classes: [] });

    const [section, classes] = await Promise.all([
      Section.findById(enrollment.sectionId).lean(),
      ClassSchedule.find({ termId: term._id, sectionId: enrollment.sectionId }).sort({ dayOfWeek: 1, startMinutes: 1 }).lean(),
    ]);
    if (!section) return Response.json({ student: { name: auth.user.name, studentNumber: auth.user.studentNumber }, term: null, section: null, classes: [] });
    const [program, subjects, teachers, rooms] = await Promise.all([
      Program.findById(section.programId).lean(),
      Subject.find({ _id: { $in: classes.map((item) => item.subjectId) } }).lean(),
      Teacher.find({ _id: { $in: classes.map((item) => item.teacherId) } }).lean(),
      Room.find({ _id: { $in: classes.map((item) => item.roomId).filter(Boolean) } }).lean(),
    ]);
    const subjectById = new Map(subjects.map((item) => [String(item._id), item]));
    const teacherById = new Map(teachers.map((item) => [String(item._id), item]));
    const roomById = new Map(rooms.map((item) => [String(item._id), item]));

    return Response.json({
      student: { name: auth.user.name, studentNumber: auth.user.studentNumber },
      term: { startYear: term.startYear, semester: term.semester },
      section: { name: section.name, yearLevel: section.yearLevel, program: program?.code ?? "" },
      classes: classes.map((item) => {
        const teacher = teacherById.get(String(item.teacherId));
        const room = item.roomId ? roomById.get(String(item.roomId)) : null;
        const subject = subjectById.get(String(item.subjectId));
        return {
          id: String(item._id),
          dayOfWeek: item.dayOfWeek === 6 ? 0 : item.dayOfWeek + 1,
          startTime: toHHMM(item.startMinutes),
          endTime: toHHMM(item.endMinutes),
          modality: item.mode === "online" ? "online" : "face_to_face",
          subject: subject ? { id: String(subject._id), code: subject.code, name: subject.name, units: subject.units } : null,
          teacher: teacher ? `${teacher.firstName} ${teacher.lastName}` : "To be assigned",
          room: room ? `${room.name} (${room.building})` : null,
        };
      }),
    });
  } catch (error) {
    console.error("Student portal data load failed:", error);
    return Response.json({ error: "Could not load your student portal." }, { status: 500 });
  }
}
