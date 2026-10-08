import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { connectDB } from "@/backend/database/db";
import { forgetAccountSessions, hashPassword } from "@/backend/auth/auth";
import { findActiveAccount } from "@/backend/auth/auth";
import { AuthAccount, PasswordSetupToken } from "@/backend/models";
import { clientIp, LIMITS, rateLimit } from "@/backend/services/rate-limit";
import { audit } from "@/backend/services/audit";

const resetSchema = z.object({
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
  const parsed = resetSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Enter your email, six-digit code, and a password of at least 12 characters." }, { status: 400 });
  const { email, code, password } = parsed.data;
  const limited = await rateLimit(LIMITS.codeVerify, clientIp(request.headers));
  if (limited) return limited;

  try {
    await connectDB();
    const token = await PasswordSetupToken.findOne({ email, purpose: "reset", expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } }).select("+codeHash");
    if (!token || !token.accountId) return Response.json({ error: "The code is invalid or expired. Request a new verification code." }, { status: 400 });

    const submitted = Buffer.from(hashCode(email, code), "hex");
    const expected = Buffer.from(token.codeHash, "hex");
    if (submitted.length !== expected.length || !timingSafeEqual(submitted, expected)) {
      await PasswordSetupToken.updateOne({ _id: token._id }, { $inc: { attempts: 1 } });
      return Response.json({ error: "The code is invalid or expired. Request a new verification code." }, { status: 400 });
    }

    const found = await findActiveAccount(email);
    if (!found || String(found.account._id) !== String(token.accountId)) {
      await PasswordSetupToken.deleteOne({ _id: token._id });
      return Response.json({ error: "This account is no longer eligible for password reset." }, { status: 409 });
    }
    const consumed = await PasswordSetupToken.findOneAndDelete({ _id: token._id, purpose: "reset", codeHash: token.codeHash, expiresAt: { $gt: new Date() }, attempts: { $lt: MAX_ATTEMPTS } });
    if (!consumed) return Response.json({ error: "The code is invalid or expired. Request a new verification code." }, { status: 400 });

    await AuthAccount.updateOne({ _id: found.account._id, email }, { $set: { passwordHash: await hashPassword(password) }, $inc: { authVersion: 1 } });
    forgetAccountSessions(String(found.account._id));
    await audit({ id: String(found.account._id), role: found.account.role, name: email }, "account", "password.reset", `Password reset by email code for ${email}`, { type: "account", id: String(found.account._id) });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Password reset failed:", error);
    return Response.json({ error: "Could not reset the password right now." }, { status: 500 });
  }
}
