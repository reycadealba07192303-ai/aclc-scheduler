import { requireRole } from "@/backend/auth/auth";
import { connectDB } from "@/backend/database/db";
import { Section, Student, StudentEnrollment } from "@/backend/models";
import { z } from "zod";

const idSchema = z.string().regex(/^[a-f\d]{24}$/i);
const importSchema = z.object({
  students: z.array(z.object({
    studentId: z.string().trim().min(1).max(50).transform((value) => value.toUpperCase()),
    name: z.string().trim().min(1).max(160),
    email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  })).min(1).max(1000),
}).superRefine(({ students }, context) => {
  const seen = new Set<string>();
  students.forEach((student, index) => {
    if (seen.has(student.studentId)) {
      context.addIssue({ code: "custom", path: ["students", index, "studentId"], message: "Student IDs must be unique in the import file." });
    }
    seen.add(student.studentId);
  });
});

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Invalid section ID." }, { status: 400 });

  try {
    await connectDB();
    const section = await Section.findById(id).select("_id termId").lean();
    if (!section) return Response.json({ error: "Section not found." }, { status: 404 });
    const enrollments = await StudentEnrollment.find({ sectionId: section._id, termId: section.termId }).select("studentId").lean();
    const students = await Student.find({ _id: { $in: enrollments.map((item) => item.studentId) } }).sort({ studentNumber: 1 }).lean();
    return Response.json({ students: students.map((student) => ({ id: String(student._id), studentId: student.studentNumber, name: student.name, email: student.email || student.rosterEmail || "" })) });
  } catch (error) {
    console.error("Section student list failed:", error);
    return Response.json({ error: "Could not load this section's students." }, { status: 500 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { id } = await context.params;
  if (!idSchema.safeParse(id).success) return Response.json({ error: "Invalid section ID." }, { status: 400 });

  const parsed = importSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Use unique student IDs, names, and valid school emails for each row.", details: parsed.error.flatten() }, { status: 400 });

  try {
    await connectDB();
    const section = await Section.findById(id).select("_id termId").lean();
    if (!section) return Response.json({ error: "Section not found." }, { status: 404 });

    const numbers = parsed.data.students.map((student) => student.studentId);
    const existingStudents = await Student.find({ studentNumber: { $in: numbers } }).select("_id studentNumber").lean();
    const enrollmentConflicts = await StudentEnrollment.find({
      studentId: { $in: existingStudents.map((student) => student._id) },
      termId: section.termId,
      sectionId: { $ne: section._id },
    }).select("studentId").lean();
    if (enrollmentConflicts.length) {
      const conflictIds = new Set(enrollmentConflicts.map((enrollment) => String(enrollment.studentId)));
      const studentNumbers = existingStudents.filter((student) => conflictIds.has(String(student._id))).map((student) => student.studentNumber);
      return Response.json({ error: `Already enrolled in another section this term: ${studentNumbers.join(", ")}.` }, { status: 409 });
    }

    await Student.bulkWrite(parsed.data.students.map((student) => ({
      updateOne: {
        filter: { studentNumber: student.studentId },
        update: { $set: { name: student.name, rosterEmail: student.email, status: "active" }, $setOnInsert: { studentNumber: student.studentId } },
        upsert: true,
      },
    })));
    const students = await Student.find({ studentNumber: { $in: numbers } }).select("_id studentNumber").lean();
    const studentIdsByNumber = new Map(students.map((student) => [student.studentNumber, student._id]));
    const enrollmentOperations = parsed.data.students.map((student) => {
      const studentId = studentIdsByNumber.get(student.studentId);
      if (!studentId) throw new Error("Student record could not be created.");
      return {
        updateOne: {
          filter: { studentId, termId: section.termId },
          update: { $setOnInsert: { studentId, termId: section.termId, sectionId: section._id } },
          upsert: true,
        },
      };
    });
    const enrollmentResult = await StudentEnrollment.bulkWrite(enrollmentOperations);

    return Response.json({
      ok: true,
      added: enrollmentResult.upsertedCount,
      alreadyInSection: parsed.data.students.length - enrollmentResult.upsertedCount,
    }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return Response.json({ error: "A student record conflicts with existing data. Refresh the roster and try again." }, { status: 409 });
    }
    console.error("Section student import failed:", error);
    return Response.json({ error: "Could not import the students." }, { status: 500 });
  }
}
