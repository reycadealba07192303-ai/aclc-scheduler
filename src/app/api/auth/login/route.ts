import { z } from "zod";
import { createSessionToken, findActiveAccount, findActiveStudentAccount, setSessionCookie, verifyPassword } from "@/backend/auth/auth";
import { clientIp, LIMITS, rateLimit } from "@/backend/services/rate-limit";

const teacherLoginSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(1).max(200),
  client: z.enum(["web", "mobile"]).default("web"),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = teacherLoginSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "Enter your email or student ID and password." }, { status: 400 });
  const { identifier, password, client } = parsed.data;
  const ip = clientIp(request.headers);
  const limited = (await rateLimit(LIMITS.loginPerIp, ip)) ?? (await rateLimit(LIMITS.login, `${ip}:${identifier}`));
  if (limited) return limited;
  const isEmail = z.string().email().safeParse(identifier).success;
  try {
    const found = isEmail
      ? await findActiveAccount(identifier.toLowerCase())
      : await findActiveStudentAccount(identifier.toUpperCase());
    if (!found || (!isEmail && found.account.role !== "student") || !(await verifyPassword(password, found.account.passwordHash))) {
      return Response.json({ error: "Email or student ID, or password, is incorrect." }, { status: 401 });
    }
    if (client === "mobile" && found.account.role !== "teacher") {
      return Response.json({ error: "The mobile portal is for teacher accounts." }, { status: 403 });
    }
    const token = await createSessionToken(found.account);
    if (client === "web") await setSessionCookie(token);
    return Response.json({ ok: true, role: found.account.role, ...(client === "mobile" ? { token } : {}) });
  } catch (error) {
    console.error("Sign-in failed:", error);
    return Response.json({ error: "Could not sign in right now." }, { status: 500 });
  }
}
