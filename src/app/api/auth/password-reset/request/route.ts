import { createHmac, randomInt } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/backend/database/db";
import { isSmtpConfigured, sendTeacherSetupCode } from "@/backend/mail/mailer";
import { findActiveAccount } from "@/backend/auth/auth";
import { PasswordSetupToken } from "@/backend/models";

const requestSchema = z.object({ email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()) });
const CODE_LIFETIME_MS = 10 * 60 * 1000;
const RESEND_WAIT_MS = 60 * 1000;

function hashCode(email: string, code: string) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not configured.");
  return createHmac("sha256", secret).update(`${email}:${code}`).digest("hex");
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter the email registered to your account." }, { status: 400 });
  if (!isSmtpConfigured()) return Response.json({ error: "Email verification is not configured yet. Please contact your administrator." }, { status: 503 });
  const { email } = parsed.data;

  try {
    await connectDB();
    const found = await findActiveAccount(email);
    const generic = { ok: true, message: "If an active account uses that email, a verification code will be sent." };
    if (!found) return Response.json(generic);

    const previous = await PasswordSetupToken.findOne({ email }).select("updatedAt").lean();
    if (previous && Date.now() - new Date(previous.updatedAt).getTime() < RESEND_WAIT_MS) return Response.json(generic);

    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await PasswordSetupToken.findOneAndUpdate(
      { email },
      {
        $set: { email, purpose: "reset", accountId: found.account._id, codeHash: hashCode(email, code), attempts: 0, expiresAt: new Date(Date.now() + CODE_LIFETIME_MS) },
        $unset: { teacherId: 1, studentId: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    );
    try {
      await sendTeacherSetupCode(email, code);
    } catch (error) {
      await PasswordSetupToken.deleteOne({ email, purpose: "reset" });
      const codeValue = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "UNKNOWN";
      if (codeValue === "EAUTH") console.error("Password reset email rejected by SMTP authentication (EAUTH).");
      else console.error("Password reset email failed with SMTP code:", codeValue);
      return Response.json({ error: "Could not send the verification email. Check the SMTP settings and try again." }, { status: 503 });
    }
    return Response.json(generic);
  } catch (error) {
    console.error("Password reset request failed:", error);
    return Response.json({ error: "Could not start password reset right now." }, { status: 500 });
  }
}
