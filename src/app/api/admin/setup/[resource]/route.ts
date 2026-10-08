import { connectDB } from "@/backend/database/db";
import { Administrator, Program, Room, Section, Subject, Teacher, Term, YEAR_LEVELS } from "@/backend/models";
import { programInputSchema, roomInputSchema, sectionInputSchema, subjectInputSchema, termInputSchema } from "@/backend/validation/setup-schemas";
import { administratorInputSchema, teacherInputSchema } from "@/backend/validation/user-schemas";
import { requireRole } from "@/backend/auth/auth";
import { AuthAccount } from "@/backend/models";
import { hashPassword } from "@/backend/auth/auth";
import { z } from "zod";

function serialize(document: { toObject(): object }) {
  const fields = { ...(document.toObject() as Record<string, unknown>) };
  const id = String(fields._id);
  delete fields._id;
  delete fields.__v;
  return { ...fields, id };
}

function duplicateError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === 11000;
}

const passwordSchema = z.string().min(12).max(200);

export async function POST(request: Request, context: { params: Promise<{ resource: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { resource } = await context.params;
  try {
    await connectDB();
    const body: unknown = await request.json();

    if (resource === "terms") {
      const parsed = termInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid term data.", details: parsed.error.flatten() }, { status: 400 });
      const item = await Term.create(parsed.data);
      return Response.json({ item: serialize(item) }, { status: 201 });
    }
    if (resource === "programs") {
      const parsed = programInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid program data.", details: parsed.error.flatten() }, { status: 400 });
      const item = await Program.create(parsed.data);
      return Response.json({ item: serialize(item) }, { status: 201 });
    }
    if (resource === "subjects") {
      const parsed = subjectInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid subject data.", details: parsed.error.flatten() }, { status: 400 });
      const item = await Subject.create(parsed.data);
      return Response.json({ item: serialize(item) }, { status: 201 });
    }
    if (resource === "rooms") {
      const parsed = roomInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid room data.", details: parsed.error.flatten() }, { status: 400 });
      const item = await Room.create(parsed.data);
      return Response.json({ item: serialize(item) }, { status: 201 });
    }
    if (resource === "sections") {
      const parsed = sectionInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid section data.", details: parsed.error.flatten() }, { status: 400 });
      const [term, program] = await Promise.all([
        Term.findById(parsed.data.termId),
        Program.findOne({ code: parsed.data.program }),
      ]);
      if (!term) return Response.json({ error: "Selected academic term was not found." }, { status: 404 });
      if (!program) return Response.json({ error: "Selected program was not found." }, { status: 404 });
      const validLevels: readonly string[] = YEAR_LEVELS[program.track];
      if (!validLevels.includes(parsed.data.yearLevel)) {
        return Response.json({ error: `Year level ${parsed.data.yearLevel} is not valid for ${program.track === "college" ? "College" : "Senior High"}.` }, { status: 400 });
      }
      const item = await Section.create({
        termId: term._id,
        name: parsed.data.name,
        programId: program._id,
        yearLevel: parsed.data.yearLevel,
      });
      return Response.json({ item: { id: String(item._id), termId: String(term._id), name: item.name, program: program.code, yearLevel: item.yearLevel } }, { status: 201 });
    }
    if (resource === "teachers") {
      const parsed = teacherInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid professor data.", details: parsed.error.flatten() }, { status: 400 });
      const emailExists = await Promise.all([Teacher.exists({ email: parsed.data.email }), Administrator.exists({ email: parsed.data.email }), AuthAccount.exists({ email: parsed.data.email })]);
      if (emailExists.some(Boolean)) return Response.json({ error: "That email is already used by another user." }, { status: 409 });
      const item = await Teacher.create(parsed.data);
      return Response.json({ item: { ...serialize(item), hasLogin: false, passwordSetupPending: false } }, { status: 201 });
    }
    if (resource === "admins") {
      const parsed = administratorInputSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid administrator data.", details: parsed.error.flatten() }, { status: 400 });
      const password = z.object({ password: passwordSchema }).safeParse(body);
      if (!password.success) return Response.json({ error: "Set a password with at least 12 characters for this account." }, { status: 400 });
      const emailExists = await Promise.all([Teacher.exists({ email: parsed.data.email }), Administrator.exists({ email: parsed.data.email }), AuthAccount.exists({ email: parsed.data.email })]);
      if (emailExists.some(Boolean)) return Response.json({ error: "That email is already used by another user." }, { status: 409 });
      const item = await Administrator.create(parsed.data);
      try {
        await AuthAccount.create({ email: parsed.data.email, role: "admin", passwordHash: await hashPassword(password.data.password), administratorId: item._id });
      } catch (error) {
        await item.deleteOne();
        throw error;
      }
      return Response.json({ item: { ...serialize(item), hasLogin: true } }, { status: 201 });
    }
    return Response.json({ error: "Unknown setup resource." }, { status: 404 });
  } catch (error) {
    if (duplicateError(error)) {
      const message = resource === "sections"
        ? "A section with that name already exists in this term."
        : "That code, term, room, employee number, or email already exists.";
      return Response.json({ error: message }, { status: 409 });
    }
    console.error("Setup create failed:", error);
    return Response.json({ error: "Could not save the setup record." }, { status: 500 });
  }
}
