import { connectDB } from "@/backend/database/db";
import { Administrator, AuthAccount, PasswordSetupToken, Program, Room, Section, Subject, Teacher, Term } from "@/backend/models";
import { requireRole } from "@/backend/auth/auth";

function serialize(document: Record<string, unknown>) {
  const fields = { ...document };
  const id = String(fields._id);
  delete fields._id;
  delete fields.__v;
  return { ...fields, id };
}

export async function GET() {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  try {
    await connectDB();
    const [terms, programs, subjects, rooms, teachers, admins, sections, accounts, pendingSetupTokens] = await Promise.all([
      Term.find().sort({ startYear: -1, semester: -1 }).lean(),
      Program.find().sort({ code: 1 }).lean(),
      Subject.find().sort({ code: 1 }).lean(),
      Room.find().sort({ name: 1, building: 1 }).lean(),
      Teacher.find().sort({ lastName: 1, firstName: 1 }).lean(),
      Administrator.find().sort({ lastName: 1, firstName: 1 }).lean(),
      Section.find().sort({ name: 1 }).lean(),
      AuthAccount.find().select("role teacherId administratorId").lean(),
      PasswordSetupToken.find({ expiresAt: { $gt: new Date() }, attempts: { $lt: 5 } }).select("teacherId").lean(),
    ]);
    const programCodes = new Map(programs.map((item) => [String(item._id), item.code]));
    const teacherLogins = new Set(accounts.filter((item) => item.role === "teacher").map((item) => String(item.teacherId)));
    const adminLogins = new Set(accounts.filter((item) => item.role === "admin").map((item) => String(item.administratorId)));
    const teachersCreatingPassword = new Set(pendingSetupTokens.map((item) => String(item.teacherId)));

    return Response.json({
      terms: terms.map((item) => serialize(item as unknown as Record<string, unknown>)),
      programs: programs.map((item) => serialize(item as unknown as Record<string, unknown>)),
      subjects: subjects.map((item) => serialize(item as unknown as Record<string, unknown>)),
      rooms: rooms.map((item) => serialize(item as unknown as Record<string, unknown>)),
      teachers: teachers.map((item) => ({
        ...serialize(item as unknown as Record<string, unknown>),
        hasLogin: teacherLogins.has(String(item._id)),
        passwordSetupPending: teachersCreatingPassword.has(String(item._id)),
      })),
      admins: admins.map((item) => ({ ...serialize(item as unknown as Record<string, unknown>), hasLogin: adminLogins.has(String(item._id)) })),
      sections: sections.map((item) => ({
        id: String(item._id),
        termId: String(item.termId),
        name: item.name,
        program: programCodes.get(String(item.programId)) ?? "",
        yearLevel: item.yearLevel,
      })),
    });
  } catch (error) {
    console.error("Setup data load failed:", error);
    return Response.json({ error: "Could not load setup data from the database." }, { status: 500 });
  }
}
