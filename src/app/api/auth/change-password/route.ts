import { z } from "zod";
import { createSessionToken, forgetAccountSessions, getCurrentUser, hashPassword, setSessionCookie, verifyPassword } from "@/backend/auth/auth";
import { AuthAccount } from "@/backend/models";
import { LIMITS, rateLimit } from "@/backend/services/rate-limit";
import { audit } from "@/backend/services/audit";

const changeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(12).max(200),
});

/**
 * Changes the signed-in user's password. Other devices are signed out (the
 * account's auth version changes); this one gets a fresh session — a cookie
 * for the web and a `token` in the response for the mobile app.
 */
export async function POST(request: Request) {
  try {
    // Who is asking comes first; signed-out callers learn nothing about the input rules.
    const user = await getCurrentUser();
    if (!user) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    const limited = await rateLimit(LIMITS.changePassword, user.id);
    if (limited) return limited;
    const parsed = changeSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return Response.json({ error: "Enter your current password and a new password of at least 12 characters." }, { status: 400 });
    const { currentPassword, newPassword } = parsed.data;
    const account = await AuthAccount.findById(user.id).select("+passwordHash");
    if (!account) return Response.json({ error: "Sign in to continue." }, { status: 401 });
    if (!(await verifyPassword(currentPassword, account.passwordHash))) {
      return Response.json({ error: "Your current password is incorrect." }, { status: 400 });
    }
    if (await verifyPassword(newPassword, account.passwordHash)) {
      return Response.json({ error: "Choose a password different from your current one." }, { status: 400 });
    }
    account.passwordHash = await hashPassword(newPassword);
    account.authVersion += 1;
    await account.save();
    forgetAccountSessions(user.id);
    await audit(user, "account", "password.change", `${user.name} changed their password`, { type: "account", id: user.id });
    const token = await createSessionToken(account);
    await setSessionCookie(token);
    return Response.json({ ok: true, token });
  } catch (error) {
    console.error("Password change failed:", error);
    return Response.json({ error: "Could not change your password right now." }, { status: 500 });
  }
}
