import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { AuthAccount, Administrator, Teacher } from "@/backend/models";
import { connectDB } from "@/backend/database/db";
import { createSessionToken, hashPassword, setSessionCookie } from "@/backend/auth/auth";

const bootstrapSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(160).transform((value) => value.toLowerCase()),
  password: z.string().min(12).max(200),
  setupKey: z.string().min(1).max(256),
});

function sameSecret(candidate: string, expected: string) {
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  const parsed = bootstrapSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Complete every field. Passwords must be at least 12 characters." }, { status: 400 });
  const setupKey = process.env.AUTH_BOOTSTRAP_KEY;
  if (!setupKey || !sameSecret(parsed.data.setupKey, setupKey)) {
    return Response.json({ error: "The setup key is invalid." }, { status: 403 });
  }
  const authSecret = process.env.AUTH_SECRET;
  if (!authSecret || Buffer.from(authSecret, "base64url").length < 32) {
    return Response.json({ error: "Configure AUTH_SECRET with at least 32 random bytes before creating the first account." }, { status: 503 });
  }

  try {
    await connectDB();
    if (await AuthAccount.exists({ role: "admin" })) {
      return Response.json({ error: "The first administrator has already been created." }, { status: 409 });
    }

    const { firstName, lastName, email, password } = parsed.data;
    if (await Teacher.exists({ email })) {
      return Response.json({ error: "That email belongs to a professor profile. Use an administrator email for first-time setup." }, { status: 409 });
    }
    const wasExistingProfile = Boolean(await Administrator.exists({ email }));
    const administrator = await Administrator.findOneAndUpdate(
      { email },
      { $set: { firstName, lastName, status: "active" } },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
    let account;
    try {
      account = await AuthAccount.create({
        email,
        role: "admin",
        passwordHash: await hashPassword(password),
        administratorId: administrator._id,
        isBootstrapAdmin: true,
      });
    } catch (error) {
      if (!wasExistingProfile) await administrator.deleteOne();
      throw error;
    }
    await setSessionCookie(await createSessionToken(account));
    return Response.json({ ok: true, role: "admin" }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return Response.json({ error: "An account already exists for that email, or first-admin setup was already completed." }, { status: 409 });
    }
    console.error("First-admin setup failed:", error);
    return Response.json({ error: "Could not create the first administrator." }, { status: 500 });
  }
}
