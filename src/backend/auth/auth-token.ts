import { jwtVerify, SignJWT } from "jose";

export type AuthRole = "admin" | "teacher" | "student";
const SESSION_SECONDS = 60 * 60 * 24 * 7;

function secretKey() {
  const value = process.env.AUTH_SECRET;
  const key = value ? Buffer.from(value, "base64url") : Buffer.alloc(0);
  if (key.length < 32) throw new Error("AUTH_SECRET must contain at least 32 random bytes.");
  return new Uint8Array(key);
}

export async function createSessionToken(account: {
  _id: unknown;
  role: AuthRole;
  authVersion: number;
  administratorId?: unknown;
  teacherId?: unknown;
  studentId?: unknown;
}) {
  const profileId = account.role === "admin" ? account.administratorId : account.role === "teacher" ? account.teacherId : account.studentId;
  return new SignJWT({ role: account.role, version: account.authVersion, ...(profileId ? { pid: String(profileId) } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("aclc-scheduler")
    .setSubject(String(account._id))
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(`${SESSION_SECONDS}s`)
    .sign(secretKey());
}

export async function readSessionToken(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"], issuer: "aclc-scheduler" });
    if (
      typeof payload.sub !== "string" ||
      (payload.role !== "admin" && payload.role !== "teacher" && payload.role !== "student") ||
      typeof payload.version !== "number"
    ) return null;
    return {
      accountId: payload.sub,
      role: payload.role,
      version: payload.version,
      // Tokens issued before logout revocation have no ID; they simply expire.
      sessionId: typeof payload.jti === "string" ? payload.jti : null,
      // The linked Administrator/Teacher/Student ID; older tokens don't have it.
      profileId: typeof payload.pid === "string" ? payload.pid : null,
      expiresAt: typeof payload.exp === "number" ? new Date(payload.exp * 1000) : null,
    };
  } catch {
    return null;
  }
}

export { SESSION_SECONDS };
