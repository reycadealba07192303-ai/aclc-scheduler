import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/backend/database/db";
import { createSessionToken, hashPassword, setSessionCookie } from "@/backend/auth/auth";
import { AuthAccount, PasswordSetupToken, Student, Teacher } from "@/backend/models";
import { notifyAdmins } from "@/backend/services/notifications";
import { clientIp, LIMITS, rateLimit } from "@/backend/services/rate-limit";
import { audit } from "@/backend/services/audit";

const setupSchema = z.object({
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  code: z.string().regex(/^\d{6}$/),
  password: z.string().min(12).max(200),
});
const MAX_ATTEMPTS = 5;

function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export async function POST(request: Request) {
  const parsed = setupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your email, six-digit verification code, and a password of at least 12 characters." }, { status: 400 });
  const { email, code, password } = parsed.data;
  const limited = await rateLimit(LIMITS.codeVerify, clientIp(request.headers));
  if (limited) return limited;

  try {
    await connectDB();
    const token = await PasswordSetupToken.findOne({ email, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } }).select("+codeHash");
    if (!token || token.purpose !== "setup") {
      console.warn("Password setup verification token missing, expired, or wrong purpose.");
      return Response.json({ error: "This verification code expired or was replaced. Request a new code and enter the latest one." }, { status: 400 });
    }

    const submittedHash = Buffer.from(hashCode(email, code), "hex");
    const storedHash = Buffer.from(token.codeHash, "hex");
    if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
      await PasswordSetupToken.updateOne({ _id: token._id }, { $inc: { attempts: 1 } });
      console.warn("Password setup OTP did not match the current code.");
      return Response.json({ error: "That code does not match the latest email. Check the newest message and try again." }, { status: 400 });
    }

    const teacher = token.teacherId ? await Teacher.findOne({ _id: token.teacherId, email, status: "active" }) : null;
    const student = token.studentId ? await Student.findOne({ _id: token.studentId, status: { $ne: "inactive" } }) : null;
    const alreadyLinked = teacher
      ? await AuthAccount.exists({ $or: [{ email }, { teacherId: token.teacherId }] })
      : student ? await AuthAccount.exists({ $or: [{ email }, { studentId: token.studentId }] }) : true;
    const studentEmailUsed = student && await Student.exists({ email, _id: { $ne: student._id } });
    if ((!teacher && !student) || alreadyLinked || studentEmailUsed) {
      await PasswordSetupToken.deleteOne({ _id: token._id });
      return Response.json({ error: "This account is no longer eligible for setup." }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);

    const consumed = await PasswordSetupToken.findOneAndDelete({
      _id: token._id,
      codeHash: token.codeHash,
      expiresAt: { $gt: new Date() },
      attempts: { $lt: MAX_ATTEMPTS },
    });
    if (!consumed) {
      console.warn("Password setup token was consumed or expired during verification.");
      return Response.json({ error: "This verification code expired or was already used. Request a new code." }, { status: 400 });
    }

    const role = student ? "student" : "teacher";
    if (student) {
      const activated = await Student.updateOne({ _id: student._id, status: { $ne: "inactive" } }, { $set: { email, status: "active" } });
      if (activated.matchedCount !== 1) return Response.json({ error: "This student roster record was deactivated. Ask the administrator to reactivate it." }, { status: 409 });
    }
    const account = await AuthAccount.create({
      email,
      role,
      passwordHash,
      ...(teacher ? { teacherId: teacher._id } : { studentId: student!._id }),
    });
    await notifyAdmins(teacher
      ? { type: "account", title: `Teacher account activated`, body: `${teacher.firstName} ${teacher.lastName} (${teacher.employeeNumber}) set up their password.`, link: "/admin/users" }
      : { type: "account", title: `Student account activated`, body: `${student!.name} (${student!.studentNumber}) set up their password.`, link: "/admin/users" });
    const who = teacher ? `${teacher.firstName} ${teacher.lastName}` : student!.name;
    await audit({ id: String(account._id), role, name: who }, "account", "account.activate", `${who} set up their ${role} account`, { type: "account", id: String(account._id) });
    const session = await createSessionToken(account);
    await setSessionCookie(session);
    return Response.json({ ok: true, role }, { status: 201 });
  } catch (error) {
    console.error("Account password setup failed:", error);
    return Response.json({ error: "Could not finish password setup right now." }, { status: 500 });
  }
}
