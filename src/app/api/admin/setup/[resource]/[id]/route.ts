import { Types } from "mongoose";
import { connectDB } from "@/backend/database/db";
import { Administrator, AuthAccount, ClassSchedule, PasswordSetupToken, Program, Room, Section, StudentEnrollment, Subject, Teacher, Term, YEAR_LEVELS } from "@/backend/models";
import { programInputSchema, roomInputSchema, sectionUpdateSchema, subjectInputSchema } from "@/backend/validation/setup-schemas";
import { administratorInputSchema, teacherInputSchema } from "@/backend/validation/user-schemas";
import { setLoginCredentials } from "@/backend/auth/auth";
import { z } from "zod";
import { requireRole } from "@/backend/auth/auth";

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

export async function PATCH(request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { resource, id } = await context.params;
  if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid record id." }, { status: 400 });
  try {
    await connectDB();
    const body: unknown = await request.json();
    const requestedPassword = typeof body === "object" && body !== null && "password" in body
      ? (body as { password?: unknown }).password
      : undefined;
    const password = requestedPassword === undefined || requestedPassword === ""
      ? undefined
      : passwordSchema.safeParse(requestedPassword);
    if (password && !password.success) return Response.json({ error: "Passwords must be at least 12 characters." }, { status: 400 });
    let item;
    if (resource === "programs") {
      const parsed = programInputSchema.partial().safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid program data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0) return Response.json({ error: "No program fields were provided." }, { status: 400 });
      item = await Program.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
    } else if (resource === "subjects") {
      const parsed = subjectInputSchema.partial().safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid subject data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0) return Response.json({ error: "No subject fields were provided." }, { status: 400 });
      item = await Subject.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
    } else if (resource === "rooms") {
      const parsed = roomInputSchema.partial().safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid room data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0) return Response.json({ error: "No room fields were provided." }, { status: 400 });
      item = await Room.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
    } else if (resource === "sections") {
      const parsed = sectionUpdateSchema.safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid section data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0) return Response.json({ error: "No section fields were provided." }, { status: 400 });
      const existing = await Section.findById(id);
      if (!existing) return Response.json({ error: "Section not found." }, { status: 404 });
      const program = await Program.findById(existing.programId);
      if (!program) return Response.json({ error: "Section program was not found." }, { status: 404 });
      const yearLevel = parsed.data.yearLevel ?? existing.yearLevel;
      const validLevels: readonly string[] = YEAR_LEVELS[program.track];
      if (!validLevels.includes(yearLevel)) {
        return Response.json({ error: `Year level ${yearLevel} is not valid for ${program.track === "college" ? "College" : "Senior High"}.` }, { status: 400 });
      }
      item = await Section.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
      if (item) return Response.json({ item: { id: String(item._id), termId: String(item.termId), name: item.name, program: program.code, yearLevel: item.yearLevel } });
    } else if (resource === "teachers") {
      const parsed = teacherInputSchema.partial().safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid professor data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0) return Response.json({ error: "No professor fields were provided." }, { status: 400 });
      if (parsed.data.email) {
        const emailExists = await Promise.all([
          Teacher.exists({ email: parsed.data.email, _id: { $ne: id } }),
          Administrator.exists({ email: parsed.data.email }),
          AuthAccount.exists({ email: parsed.data.email, teacherId: { $ne: id } }),
        ]);
        if (emailExists.some(Boolean)) return Response.json({ error: "That email is already used by another user." }, { status: 409 });
      }
      item = await Teacher.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
      if (!item) return Response.json({ error: "Professor not found." }, { status: 404 });
      if (parsed.data.email) await PasswordSetupToken.deleteMany({ teacherId: item._id });
      const authAccount = await setLoginCredentials("teacher", id, item.email);
      return Response.json({ item: { ...serialize(item), hasLogin: Boolean(authAccount), passwordSetupPending: false } });
    } else if (resource === "admins") {
      const parsed = administratorInputSchema.partial().safeParse(body);
      if (!parsed.success) return Response.json({ error: "Invalid administrator data.", details: parsed.error.flatten() }, { status: 400 });
      if (Object.keys(parsed.data).length === 0 && !password) return Response.json({ error: "No administrator fields or new password were provided." }, { status: 400 });
      if (parsed.data.status === "inactive") {
        const currentAdmin = await Administrator.findById(id).lean();
        const hasLogin = await AuthAccount.exists({ administratorId: id });
        if (currentAdmin?.status === "active" && hasLogin) {
          const activeAdminIds = await AuthAccount.find({ role: "admin" }).distinct("administratorId");
          const activeAdminCount = await Administrator.countDocuments({ _id: { $in: activeAdminIds }, status: "active" });
          if (activeAdminCount <= 1) return Response.json({ error: "You cannot deactivate the last active administrator account." }, { status: 409 });
        }
      }
      if (parsed.data.email) {
        const emailExists = await Promise.all([
          Administrator.exists({ email: parsed.data.email, _id: { $ne: id } }),
          Teacher.exists({ email: parsed.data.email }),
          AuthAccount.exists({ email: parsed.data.email, administratorId: { $ne: id } }),
        ]);
        if (emailExists.some(Boolean)) return Response.json({ error: "That email is already used by another user." }, { status: 409 });
      }
      item = await Administrator.findByIdAndUpdate(id, parsed.data, { new: true, runValidators: true });
      if (!item) return Response.json({ error: "Administrator not found." }, { status: 404 });
      const authAccount = await setLoginCredentials("admin", id, item.email, password?.data);
      return Response.json({ item: { ...serialize(item), hasLogin: Boolean(authAccount) } });
    } else {
      return Response.json({ error: "This setup resource cannot be edited." }, { status: 404 });
    }
    if (!item) return Response.json({ error: "Setup record not found." }, { status: 404 });
    return Response.json({ item: serialize(item) });
  } catch (error) {
    if (duplicateError(error)) {
      const message = resource === "sections"
        ? "A section with that name already exists in this term."
        : "That code, room, employee number, or email already exists.";
      return Response.json({ error: message }, { status: 409 });
    }
    console.error("Setup update failed:", error);
    return Response.json({ error: "Could not update the setup record." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ resource: string; id: string }> }) {
  const auth = await requireRole("admin");
  if (auth.response) return auth.response;
  const { resource, id } = await context.params;
  if (!Types.ObjectId.isValid(id)) return Response.json({ error: "Invalid record id." }, { status: 400 });
  try {
    await connectDB();
    if (resource === "terms") {
      const term = await Term.findById(id);
      if (!term) return Response.json({ error: "Term not found." }, { status: 404 });
      const sections = await Section.find({ termId: term._id }).select("_id").lean();
      const sectionIds = sections.map((section) => section._id);
      await ClassSchedule.deleteMany({ $or: [{ termId: term._id }, { sectionId: { $in: sectionIds } }] });
      await StudentEnrollment.deleteMany({ termId: term._id });
      await Section.deleteMany({ termId: term._id });
      await term.deleteOne();
      return Response.json({ ok: true });
    }
    if (resource === "programs") {
      const item = await Program.findById(id);
      if (!item) return Response.json({ error: "Program not found." }, { status: 404 });
      if (await Section.exists({ programId: item._id })) {
        return Response.json({ error: "This program still has sections." }, { status: 409 });
      }
      await item.deleteOne();
      return Response.json({ ok: true });
    }
    if (resource === "subjects") {
      const item = await Subject.findByIdAndDelete(id);
      if (!item) return Response.json({ error: "Subject not found." }, { status: 404 });
      await ClassSchedule.deleteMany({ subjectId: item._id });
      return Response.json({ ok: true });
    }
    if (resource === "rooms") {
      const item = await Room.findByIdAndDelete(id);
      if (!item) return Response.json({ error: "Room not found." }, { status: 404 });
      await ClassSchedule.deleteMany({ roomId: item._id });
      return Response.json({ ok: true });
    }
    if (resource === "sections") {
      const item = await Section.findByIdAndDelete(id);
      if (!item) return Response.json({ error: "Section not found." }, { status: 404 });
      await ClassSchedule.deleteMany({ sectionId: item._id });
      await StudentEnrollment.deleteMany({ sectionId: item._id, termId: item.termId });
      return Response.json({ ok: true });
    }
    if (resource === "teachers") {
      const item = await Teacher.findByIdAndDelete(id);
      if (!item) return Response.json({ error: "Professor not found." }, { status: 404 });
      await AuthAccount.deleteOne({ teacherId: item._id });
      await ClassSchedule.deleteMany({ teacherId: item._id });
      return Response.json({ ok: true });
    }
    if (resource === "admins") {
      const existingAccount = await AuthAccount.findOne({ administratorId: id });
      if (existingAccount && await AuthAccount.countDocuments({ role: "admin" }) <= 1) {
        return Response.json({ error: "You cannot remove the last administrator account." }, { status: 409 });
      }
      const item = await Administrator.findByIdAndDelete(id);
      if (!item) return Response.json({ error: "Administrator not found." }, { status: 404 });
      await AuthAccount.deleteOne({ administratorId: item._id });
      return Response.json({ ok: true });
    }
    return Response.json({ error: "Unknown setup resource." }, { status: 404 });
  } catch (error) {
    console.error("Setup delete failed:", error);
    return Response.json({ error: "Could not delete the setup record." }, { status: 500 });
  }
}
