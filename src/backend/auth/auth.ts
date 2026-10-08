import "server-only";

import { cookies, headers } from "next/headers";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { AuthAccount, Administrator, RevokedSession, Student, Teacher } from "@/backend/models";
import { connectDB } from "@/backend/database/db";
import { createSessionToken, readSessionToken, type AuthRole } from "@/backend/auth/auth-token";
import { LIMITS, rateLimit } from "@/backend/services/rate-limit";
import type { AuthenticatedUser } from "@/shared/types";

const COOKIE_NAME = "aclc_session";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function derivePasswordKey(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scryptCallback(password, salt, length, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export type AuthUser = AuthenticatedUser;

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const derived = await derivePasswordKey(password, salt, 64);
  return `scrypt$16384$8$1$${salt.toString("base64url")}$${derived.toString("base64url")}`;
}

export async function setLoginCredentials(role: AuthRole, profileId: string, email: string, password?: string) {
  const filter = role === "admin" ? { role, administratorId: profileId } : role === "teacher" ? { role, teacherId: profileId } : { role, studentId: profileId };
  const existing = await AuthAccount.findOne(filter);
  const passwordHash = password ? await hashPassword(password) : undefined;
  if (existing) {
    existing.email = email.toLowerCase();
    if (passwordHash) {
      existing.passwordHash = passwordHash;
      existing.authVersion += 1;
    }
    await existing.save();
    return existing;
  }
  if (!passwordHash) return null;
  return AuthAccount.create({
    ...filter,
    email: email.toLowerCase(),
    passwordHash,
    authVersion: 0,
  });
}

export async function verifyPassword(password: string, storedHash: string) {
  const [algorithm, cost, blockSize, parallelism, saltValue, hashValue] = storedHash.split("$");
  if (algorithm !== "scrypt" || cost !== "16384" || blockSize !== "8" || parallelism !== "1" || !saltValue || !hashValue) {
    return false;
  }
  const salt = Buffer.from(saltValue, "base64url");
  const expected = Buffer.from(hashValue, "base64url");
  const actual = await derivePasswordKey(password, salt, expected.length);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

/**
 * Ends the current session: the token (web cookie or mobile bearer token)
 * stops working immediately, even if someone copied it.
 */
export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const authorization = (await headers()).get("authorization");
  const token = authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? cookieStore.get(COOKIE_NAME)?.value;
  const claims = await readSessionToken(token);
  if (!claims?.sessionId || !claims.expiresAt) return;
  await connectDB();
  await RevokedSession.updateOne(
    { sessionId: claims.sessionId },
    { $setOnInsert: { sessionId: claims.sessionId, expiresAt: claims.expiresAt } },
    { upsert: true },
  );
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const authorization = (await headers()).get("authorization");
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  const claims = await readSessionToken(bearerToken ?? cookieStore.get(COOKIE_NAME)?.value);
  if (!claims) return null;
  await connectDB();
  if (claims.sessionId && (await RevokedSession.exists({ sessionId: claims.sessionId }))) return null;
  const account = await AuthAccount.findById(claims.accountId).select("email role authVersion administratorId teacherId studentId");
  if (!account || account.role !== claims.role || account.authVersion !== claims.version) return null;

  if (account.role === "admin" && account.administratorId) {
    const admin = await Administrator.findOne({ _id: account.administratorId, status: "active" }).lean();
    if (!admin) return null;
    return {
      id: String(account._id),
      email: account.email,
      role: "admin",
      name: `${admin.firstName} ${admin.lastName}`,
      administratorId: String(admin._id),
    };
  }
  if (account.role === "teacher" && account.teacherId) {
    const teacher = await Teacher.findOne({ _id: account.teacherId, status: "active" }).lean();
    if (!teacher) return null;
    return {
      id: String(account._id),
      email: account.email,
      role: "teacher",
      name: `${teacher.firstName} ${teacher.lastName}`,
      teacherId: String(teacher._id),
    };
  }
  if (account.role === "student" && account.studentId) {
    const student = await Student.findOne({ _id: account.studentId, status: "active" }).lean();
    if (!student || student.email !== account.email) return null;
    return {
      id: String(account._id),
      email: account.email,
      role: "student",
      name: student.name,
      studentId: String(student._id),
      studentNumber: student.studentNumber,
    };
  }
  return null;
}

export async function requireRole(role: AuthRole) {
  try {
    const user = await getCurrentUser();
    if (!user) return { user: null, response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
    if (user.role !== role) return { user: null, response: Response.json({ error: "You do not have permission to do that." }, { status: 403 }) };
    const limited = await rateLimit(LIMITS.api, user.id);
    if (limited) return { user: null, response: limited };
    return { user, response: null };
  } catch (error) {
    console.error("Authentication check failed:", error);
    return { user: null, response: Response.json({ error: "Could not verify your account." }, { status: 500 }) };
  }
}

export async function findActiveAccount(email: string) {
  await connectDB();
  const account = await AuthAccount.findOne({ email: email.toLowerCase() }).select("+passwordHash");
  if (!account) return null;
  const profile = account.role === "admin"
    ? await Administrator.findOne({ _id: account.administratorId, status: "active" }).lean()
    : account.role === "teacher"
      ? await Teacher.findOne({ _id: account.teacherId, status: "active" }).lean()
      : await Student.findOne({ _id: account.studentId, status: "active", email: account.email }).lean();
  return profile ? { account, profile } : null;
}

export async function findActiveStudentAccount(studentNumber: string) {
  await connectDB();
  const student = await Student.findOne({ studentNumber: studentNumber.trim().toUpperCase(), status: "active" }).lean();
  if (!student || !student.email) return null;
  const account = await AuthAccount.findOne({ role: "student", studentId: student._id, email: student.email }).select("+passwordHash");
  return account ? { account, profile: student } : null;
}

export { COOKIE_NAME, SESSION_SECONDS, createSessionToken };
