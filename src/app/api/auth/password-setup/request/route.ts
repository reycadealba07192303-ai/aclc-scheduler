import { createHmac, randomInt } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/backend/database/db";
import { isSmtpConfigured, sendTeacherSetupCode } from "@/backend/mail/mailer";
import { AuthAccount, PasswordSetupToken, Student, Teacher } from "@/backend/models";

const requestSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()).optional(),
});
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(2, name.length - 2))}@${domain}`;
}

function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter a valid email or student ID, and the registered student email when needed." }, { status: 400 });
  if (!isSmtpConfigured()) {
    return Response.json({ error: "Email verification is not configured yet. Please contact your administrator." }, { status: 503 });
  }

  try {
    await connectDB();
    const isEmail = z.string().email().safeParse(parsed.data.identifier).success;
    const email = isEmail ? parsed.data.identifier.toLowerCase() : parsed.data.email;
    if (!email) return Response.json({ error: "Enter the school email registered to this student." }, { status: 400 });
    const teacher = isEmail ? await Teacher.findOne({ email, status: "active" }).select("_id").lean() : null;
    const studentCandidate = teacher ? null : isEmail
      ? await Student.findOne({ email }).select("_id status").lean()
      // Older imported roster records predate the status field; treat those as eligible unless explicitly inactive.
      : await Student.findOne({ studentNumber: parsed.data.identifier.toUpperCase() }).select("_id status").lean();
    const student = studentCandidate?.status === "inactive" ? null : studentCandidate;
    const alreadyLinked = teacher
      ? await AuthAccount.exists({ $or: [{ email }, { teacherId: teacher._id }] })
      : student ? await AuthAccount.exists({ $or: [{ email }, { studentId: student._id }] }) : true;
    const emailAlreadyUsed = !isEmail && Boolean(
      (await AuthAccount.exists({ email })) ||
      (student && await Student.exists({ email, _id: { $ne: student._id } })),
    );
    if (!teacher && !student) {
      if (studentCandidate) return Response.json({ error: "This student record is inactive. Ask the administrator to reactivate the roster entry, then try again." }, { status: 403 });
      return Response.json({ error: isEmail ? "No active teacher account matches this email." : "We couldn't find this student ID in the imported roster. Import the student into a section first, then try again." }, { status: 404 });
    }
    if (alreadyLinked) return Response.json({ error: "A password is already set for this account. Sign in or use Forgot password." }, { status: 409 });
    if (emailAlreadyUsed) return Response.json({ error: "That email is already used by another account. Use a different email address." }, { status: 409 });

    const existing = await PasswordSetupToken.findOne({ email }).select("updatedAt").lean();
    if (existing && Date.now() - new Date(existing.updatedAt).getTime() < RESEND_WAIT_MS) {
      return Response.json({ error: "A verification code was just requested. Wait one minute, then try again; the latest code is the one that works." }, { status: 429 });
    }

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await PasswordSetupToken.findOneAndUpdate(
      { email },
      {
        $set: { email, purpose: "setup", ...(teacher ? { teacherId: teacher._id } : { studentId: student!._id }), codeHash: hashCode(email, code), attempts: 0, expiresAt: new Date(Date.now() + CODE_LIFETIME_MS) },
        $unset: { ...(teacher ? { studentId: 1 } : { teacherId: 1 }), accountId: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    try {
      await sendTeacherSetupCode(email, code);
    } catch (error) {
      await PasswordSetupToken.deleteOne({ email });
      const smtpCode = typeof error === "object" && error !== null && "code" in error
        ? String((error as { code: unknown }).code)
        : "UNKNOWN";
      if (smtpCode === "EAUTH") {
        console.error("Teacher setup email rejected by SMTP authentication (EAUTH).");
        return Response.json({
          error: "Gmail rejected the SMTP login. Check SMTP_USER and make sure SMTP_PASSWORD is a current 16-character Google App Password in src/backend/.env. Spaces are okay; restart the app after changing it.",
        }, { status: 503 });
      }
      console.error("Teacher setup email failed with SMTP code:", smtpCode);
      return Response.json({ error: "Could not send the verification email. Check the SMTP settings and try again." }, { status: 503 });
    }
    console.info("Account setup verification email sent.");
    return Response.json({ ok: true, sent: true, message: `Verification code sent to ${maskEmail(email)}. Check your inbox and spam folder.` });
  } catch (error) {
    console.error("Account password setup request failed:", error);
    return Response.json({ error: "Could not start password setup right now." }, { status: 500 });
  }
}
