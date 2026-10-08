import "server-only";

import { cookies, headers } from "next/headers";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { AuthAccount, Administrator, RevokedSession, Student, Teacher } from "@/backend/models";
import { connectDB } from "@/backend/database/db";
import { createSessionToken, readSessionToken, type AuthRole } from "@/backend/auth/auth-token";
import { LIMITS, rateLimitLocal } from "@/backend/services/rate-limit";
import { forget, forgetTag, memo } from "@/backend/cache/memo";
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
  const token = await requestToken();
  const claims = await readSessionToken(token);
  if (!claims?.sessionId || !claims.expiresAt || !token) return;
  await connectDB();
  await RevokedSession.updateOne(
    { sessionId: claims.sessionId },
    { $setOnInsert: { sessionId: claims.sessionId, expiresAt: claims.expiresAt } },
    { upsert: true },
  );
  forget(sessionCacheKey(claims, token));
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/** How long a signed-in user lookup is reused on one server instance. */
const SESSION_CACHE_MS = 15_000;

async function requestToken() {
  const authorization = (await headers()).get("authorization");
  return authorization?.match(/^Bearer\s+(.+)$/i)?.[1] ?? (await cookies()).get(COOKIE_NAME)?.value;
}

const sessionCacheKey = (claims: { sessionId: string | null }, token: string) => `session:${claims.sessionId ?? token}`;

/** Forgets cached sign-ins for an account, e.g. after its password changes. */
export function forgetAccountSessions(accountId: string) {
  forgetTag(`account:${accountId}`);
}

function findProfile(role: AuthRole, id: unknown) {
  if (role === "admin") return Administrator.findOne({ _id: id, status: "active" }).lean();
  if (role === "teacher") return Teacher.findOne({ _id: id, status: "active" }).lean();
  return Student.findOne({ _id: id, status: "active" }).lean();
}

/**
 * Who is signed in, from the session cookie (web) or bearer token (mobile).
 * The account, the logout check, and the profile load in one parallel round
 * trip, and the result is reused for 15 seconds on this server instance
 * (logout and password changes clear it right away).
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await requestToken();
  const claims = await readSessionToken(token);
  if (!claims || !token) return null;
  return memo(sessionCacheKey(claims, token), SESSION_CACHE_MS, () => loadUser(claims), [`account:${claims.accountId}`]);
}

async function loadUser(claims: NonNullable<Awaited<ReturnType<typeof readSessionToken>>>): Promise<AuthUser | null> {
  await connectDB();
  const [revoked, account, earlyProfile] = await Promise.all([
    claims.sessionId ? RevokedSession.exists({ sessionId: claims.sessionId }) : null,
    AuthAccount.findById(claims.accountId).select("email role authVersion administratorId teacherId studentId").lean(),
    claims.profileId ? findProfile(claims.role as AuthRole, claims.profileId) : null,
  ]);
  if (revoked || !account || account.role !== claims.role || account.authVersion !== claims.version) return null;
  const linkedId = account.role === "admin" ? account.administratorId : account.role === "teacher" ? account.teacherId : account.studentId;
  if (!linkedId) return null;
  // Use the profile loaded in parallel only if it is still the one linked to the account.
  const profile = earlyProfile && String(linkedId) === claims.profileId ? earlyProfile : await findProfile(account.role as AuthRole, linkedId);
  if (!profile) return null;
  const base = { id: String(account._id), email: account.email };

  if (account.role === "admin") {
    const admin = profile as { _id: unknown; firstName: string; lastName: string };
    return { ...base, role: "admin", name: `${admin.firstName} ${admin.lastName}`, administratorId: String(admin._id) };
  }
  if (account.role === "teacher") {
    const teacher = profile as { _id: unknown; firstName: string; lastName: string };
    return { ...base, role: "teacher", name: `${teacher.firstName} ${teacher.lastName}`, teacherId: String(teacher._id) };
  }
  const student = profile as { _id: unknown; name: string; studentNumber: string; email?: string | null };
  if (student.email !== account.email) return null;
  return { ...base, role: "student", name: student.name, studentId: String(student._id), studentNumber: student.studentNumber };
}

export async function requireRole(role: AuthRole) {
  try {
    const user = await getCurrentUser();
    if (!user) return { user: null, response: Response.json({ error: "Sign in to continue." }, { status: 401 }) };
    if (user.role !== role) return { user: null, response: Response.json({ error: "You do not have permission to do that." }, { status: 403 }) };
    const limited = rateLimitLocal(LIMITS.api, user.id);
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
